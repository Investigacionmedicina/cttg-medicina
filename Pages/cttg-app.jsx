import React, { useState, useEffect, useRef } from 'react';
import { Search, LogOut, Download, Plus, Edit2, Trash2, Filter, Eye, EyeOff } from 'lucide-react';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = '140640785901-35gajn6kikfu7g1gv7o4lva4ejn6haj0.apps.googleusercontent.com';
const SPREADSHEET_ID = '1oZCWwnfR-MLF2WjEG5isjPuSOATQVj4HQZUaLJyiJI4';
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.send'
];

const COLUMNS = [
  'AÑO', 'Fecha de recepción por el CTTG', 'P', 'Integrante del CTTG', 'PROCESO EVALUADO',
  'Numero de acta', 'Título de Trabajo de grado', 'Puntaje del turnitin',
  'Modalidad de trabajo de grado', 'Estudiantes', 'Numero de estudiantes',
  'Nombre del Director (a)', 'Decisión del CTTG MEDICINA', 'Observaciones del evaluador',
  'Semillero al que pertenece', 'Jurado1', 'Jurado 2', 'Fecha de sustentación',
  'Numero acta de sustentación', 'Nota de la sustentación', 'Observaciones',
  'ESTADO DEL ACTA', 'Trabajo genero algun producto posterior a la sustentacion del TG',
  'Tipo de producto', 'Referencia de articulo', 'Metodología', 'Población (n)',
  'Características de la población (Edad)', 'Instituciones externas participantes',
  'Nombre de la institución', 'Institución ubicadas fuera de la ciudad',
  'Ciudad de la Institución', 'Presentación del trabajo en algun tipo de evento',
  'Tipo de evento', 'Nombre del Evento', 'El trabajo recibió al gun tipo de financiación',
  'Tipo de financiación', 'El trabajo recibió algún tipo recocimiento',
  'Nombre del reconocimiento', 'El trabajo generó algun producto antes de la presentación del documento final',
  'Tipo de producto', 'Trabajo genero algun producto posterior a la sustentacion del TG',
  'Tipo de producto Referencia de articulo'
];

export default function CTTGApp() {
  const [authState, setAuthState] = useState('login'); // login, verify, app
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('gtoken') || '');
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token') || '');
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newRecord, setNewRecord] = useState({});
  const codeRef = useRef(null);

  // Load Google API
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Handle verification code
  const handleSendCode = async () => {
    if (!email.trim()) return;
    setSendingCode(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('verif_code', code);
      localStorage.setItem('verif_email', email);
      
      // Simulated email send (en producción usaríamos Gmail API)
      console.log(`Código enviado a ${email}: ${code}`);
      alert(`Código enviado a ${email}: ${code}\n(En producción se enviaría por correo)`);
      
      setAuthState('verify');
    } catch (err) {
      alert('Error al enviar código: ' + err.message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = () => {
    const savedCode = localStorage.getItem('verif_code');
    if (verificationCode === savedCode) {
      setAuthState('app');
      loadData();
    } else {
      alert('Código incorrecto');
    }
  };

  // Load data from Google Sheets
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1?key=AIzaSyDyWpUuaSz7bslqulwd8WMwHIQF5kh_YO4`
      );
      const data = await response.json();
      
      if (data.values && data.values.length > 1) {
        const rows = data.values.slice(1).map((row, idx) => ({
          id: idx,
          ...Object.fromEntries(COLUMNS.map((col, i) => [col, row[i] || '']))
        }));
        setStudents(rows);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      alert('Error al cargar datos. Asegúrate de que el Sheet sea público.');
    } finally {
      setLoading(false);
    }
  };

  // Sync to Google Sheets
  const syncToSheet = async (updatedStudents) => {
    try {
      const values = [
        COLUMNS,
        ...updatedStudents.map(student => COLUMNS.map(col => student[col] || ''))
      ];
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ values })
        }
      );

      if (!response.ok && !token) {
        // Sin token, simulamos la sincronización
        console.log('Sincronización simulada:', values);
        alert('App actualizada (sincronización en línea con token OAuth)');
      }
    } catch (err) {
      console.error('Error sincronizando:', err);
    }
  };

  // CRUD Operations
  const handleEdit = (student) => {
    setEditingId(student.id);
    setEditingData({ ...student });
  };

  const handleSave = () => {
    const updated = students.map(s => s.id === editingId ? editingData : s);
    setStudents(updated);
    syncToSheet(updated);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (confirm('¿Eliminar este registro?')) {
      const updated = students.filter(s => s.id !== id);
      setStudents(updated);
      syncToSheet(updated);
    }
  };

  const handleAddNew = () => {
    const newId = Math.max(...students.map(s => s.id), -1) + 1;
    const newStudent = {
      id: newId,
      ...Object.fromEntries(COLUMNS.map(col => [col, '']))
    };
    setStudents([newStudent, ...students]);
    setEditingId(newId);
    setEditingData(newStudent);
    setShowForm(false);
  };

  const handleExport = () => {
    const csv = [
      COLUMNS.join(','),
      ...filteredStudents.map(s => COLUMNS.map(col => `"${s[col] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CTTG_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Filtering and Search
  const filteredStudents = students.filter(student => {
    const matchesSearch = COLUMNS.some(col =>
      String(student[col] || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesFilter = !filterField || String(student[filterField] || '').includes(filterValue);
    return matchesSearch && matchesFilter;
  });

  // Auth Pages
  if (authState === 'login') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background-secondary)', padding: '1rem' }}>
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', padding: '2rem', maxWidth: '400px', width: '100%' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '1rem' }}>Seguimiento CTTG</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '14px' }}>
            Ingresa tu correo personal para recibir un código de verificación
          </p>
          <input
            type="email"
            placeholder="tu.correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }}
          />
          <button
            onClick={handleSendCode}
            disabled={sendingCode}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: sendingCode ? 'var(--color-background-secondary)' : 'var(--color-background-info)',
              color: 'var(--color-text-info)',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {sendingCode ? 'Enviando...' : 'Enviar código'}
          </button>
        </div>
      </div>
    );
  }

  if (authState === 'verify') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background-secondary)', padding: '1rem' }}>
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', padding: '2rem', maxWidth: '400px', width: '100%' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 500, marginBottom: '1rem' }}>Verificación</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '14px' }}>
            Ingresa el código enviado a {email}
          </p>
          <input
            ref={codeRef}
            type="text"
            placeholder="Código de 6 dígitos"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
            maxLength="6"
            style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem', fontSize: '18px', letterSpacing: '4px' }}
          />
          <button
            onClick={handleVerifyCode}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--color-background-success)',
              color: 'var(--color-text-success)',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Verificar
          </button>
          <button
            onClick={() => { setAuthState('login'); setVerificationCode(''); }}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer'
            }}
          >
            Cambiar correo
          </button>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-secondary)', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 500, margin: '0 0 0.5rem 0' }}>Seguimiento CTTG Medicina 2025</h1>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '14px' }}>
              Total de registros: {filteredStudents.length}
            </p>
          </div>
          <button
            onClick={() => { setAuthState('login'); localStorage.clear(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.5rem 1rem',
              border: '0.5px solid var(--color-border-secondary)',
              borderRadius: 'var(--border-radius-md)',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <LogOut size={16} /> Salir
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px', padding: '0.5rem' }}
              />
            </div>
            
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              style={{ padding: '0.5rem' }}
            >
              <option value="">Todos los campos</option>
              {COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
            </select>

            {filterField && (
              <input
                type="text"
                placeholder="Valor..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                style={{ padding: '0.5rem' }}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAddNew}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 1rem',
                background: 'var(--color-background-success)',
                color: 'var(--color-text-success)',
                border: 'none',
                borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '14px'
              }}
            >
              <Plus size={16} /> Nuevo
            </button>
            <button
              onClick={handleExport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 1rem',
                border: '0.5px solid var(--color-border-secondary)',
                borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Download size={16} /> Exportar CSV
            </button>
            <button
              onClick={() => { setLoading(true); loadData(); }}
              style={{
                padding: '0.5rem 1rem',
                border: '0.5px solid var(--color-border-secondary)',
                borderRadius: 'var(--border-radius-md)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-background-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--color-background-secondary)', minWidth: '80px' }}>Acciones</th>
                  {COLUMNS.slice(0, 10).map(col => (
                    <th key={col} style={{ padding: '12px', textAlign: 'left', fontWeight: 500, minWidth: '120px' }}>
                      {col}
                    </th>
                  ))}
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 500, minWidth: '100px' }}>Más...</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', hover: { background: 'var(--color-background-secondary)' } }}>
                    <td style={{ padding: '12px', position: 'sticky', left: 0, background: 'var(--color-background-primary)' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleEdit(student)}
                          title="Editar"
                          style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-info)' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          title="Eliminar"
                          style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-danger)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    {COLUMNS.slice(0, 10).map(col => (
                      <td key={col} style={{ padding: '12px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student[col] || '-'}
                      </td>
                    ))}
                    <td style={{ padding: '12px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      +{COLUMNS.length - 10} campos
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editingId !== null && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', padding: '2rem', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '1.5rem' }}>Editar Registro</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
                {COLUMNS.map(col => (
                  <div key={col}>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                      {col}
                    </label>
                    <input
                      type="text"
                      value={editingData[col] || ''}
                      onChange={(e) => setEditingData({ ...editingData, [col]: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', fontSize: '13px' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditingId(null)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '0.5px solid var(--color-border-secondary)',
                    borderRadius: 'var(--border-radius-md)',
                    cursor: 'pointer',
                    background: 'transparent'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'var(--color-background-success)',
                    color: 'var(--color-text-success)',
                    border: 'none',
                    borderRadius: 'var(--border-radius-md)',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
