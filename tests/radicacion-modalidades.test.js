/**
 * Radicación — una iteración válida por cada modalidad «con tutor» del select.
 * Comprueba que radicar() envía createRadicacion con la modalidad literal correcta.
 * (Diplomado tiene cobertura detallada en diplomado-flujo.test.js.)
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'estudiante_dashboard.html');
const htmlContent = fs.readFileSync(HTML_PATH, 'utf8');

function extractBodyHtml() {
  const m = htmlContent.match(/<body>([\s\S]*?)<\/body>/i);
  if (!m) return '';
  return m[1].replace(/<script[\s\S]*?<\/script>/gi, '');
}

function extractScript() {
  const m = htmlContent.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);
  return m ? m[1] : '';
}

const BODY_HTML = extractBodyHtml();
const SCRIPT_RAW = extractScript();

const MOCK_USER = { nombre: 'Test Estudiante', email: 'estudiante.prueba@usc.edu.co', rol: 'estudiante' };
const MOCK_TOKEN = 'tok-modalidades-001';

async function flushPromises(rounds = 8) {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function bootPage() {
  localStorage.clear();
  localStorage.setItem('cttg_user', JSON.stringify(MOCK_USER));
  localStorage.setItem('cttg_token', MOCK_TOKEN);

  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({
      success: true,
      radicaciones: [],
      actas: [],
      protocolos: [],
      fase3: [],
    }),
  });

  document.body.innerHTML = BODY_HTML;
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: 'http://localhost/estudiante_dashboard.html' },
  });

  window.eval(SCRIPT_RAW);
  await flushPromises();
}

function fillBaseMasTutor(modalidadLabel) {
  const v = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.value = val;
  };
  v('cedula1', '1090123456');
  v('nombre1', 'María Modalidad Test');
  v('email1', MOCK_USER.email);
  v('telefono1', '3007654321');
  v('semestre1', '9');
  v('titulo', 'Proyecto de prueba por modalidad');
  v('modalidad', modalidadLabel);
  v('area', 'Medicina Interna');
  v('tutor1Nombre', 'Dr. Tutor QA');
  v('tutor1Email', 'tutor.qa@usc.edu.co');
}

/** Deben coincidir con las opciones «con tutor» en estudiante_dashboard.html (#modalidad). */
const MODALIDADES_CON_TUTOR = [
  'Trabajo de investigación',
  'Monografia Revision sistematica',
  'Monografia Reporte de caso',
  'Monografia serie de casos',
  'Monografia Metaanalisis',
  'Monografia revision de alcance',
];

describe('Radicación — todas las modalidades con tutor', () => {
  beforeEach(async () => {
    await bootPage();
  });

  test.each(MODALIDADES_CON_TUTOR)(
    'envía createRadicacion con modalidad exacta: %s',
    async (modalidad) => {
      fillBaseMasTutor(modalidad);
      global.fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, numero: 'RAD-QA-001' }),
      });

      await window.radicar();
      await flushPromises();

      const createCall = global.fetch.mock.calls.find(
        ([, opts]) => opts && opts.body && String(opts.body).includes('createRadicacion'),
      );
      expect(createCall).toBeTruthy();
      const body = JSON.parse(createCall[1].body);
      expect(body.action).toBe('createRadicacion');
      expect(body.datos.modalidad).toBe(modalidad);
      expect(body.datos.tutor1Nombre).toBe('Dr. Tutor QA');
      expect(body.datos.area).toBe('Medicina Interna');
      expect(body.emailEstudiante).toBe(MOCK_USER.email);
    },
  );

  test('con 2 estudiantes — monografía envía segundo estudiante en datos', async () => {
    const mod = 'Monografia Reporte de caso';
    fillBaseMasTutor(mod);
    window.setEst(2, document.querySelector('.ne:nth-child(2)'));
    document.getElementById('cedula2').value = '8800112233';
    document.getElementById('nombre2').value = 'Otro estudiante QA';
    document.getElementById('email2').value = 'otro.est@usc.edu.co';
    document.getElementById('telefono2').value = '3011122334';
    document.getElementById('semestre2').value = '8';

    global.fetch.mockResolvedValueOnce({
      json: async () => ({ success: true, numero: 'RAD-QA-TWO' }),
    });
    await window.radicar();
    await flushPromises();

    const createCall = global.fetch.mock.calls.find(([, opts]) =>
      String(opts.body || '').includes('createRadicacion'),
    );
    expect(createCall).toBeTruthy();
    const body = JSON.parse(createCall[1].body);
    expect(body.datos.modalidad).toBe(mod);
    expect(body.datos.nombre2).toBeTruthy();
    expect(body.datos.cedula2).toBe('8800112233');
  });
});
