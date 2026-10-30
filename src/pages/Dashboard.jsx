import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { 
  LogOut, 
  Users, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Database, 
  Eye, 
  X, 
  FileCheck,
  ShieldCheck,
  FolderOpen,
  XCircle,
  MessageCircle,
  PhoneCall,
  AlertCircle,
  Phone,
  UserCheck,
  PieChart,
  Key,
  Copy,
  Check,
  Trash2,
  Mail,
  Shield,
  FileSpreadsheet,
  MapPin,
  Layers,
  Pencil
} from 'lucide-react';
import * as xlsx from 'xlsx';
import MapaTactico from '../components/MapaTactico';
import GestionCapacitacion from '../components/GestionCapacitacion';
import GestionJerarquia from '../components/GestionJerarquia';
import { Megaphone } from 'lucide-react';

// Portal Oficial de Consulta Pública
const PORTAL_CONSULTA_URL = "https://amigosdeleoncix.onrender.com/";

// Formulario Oficial de Google Forms (Fase 2)
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfO_z7lnEDjQR37y7V7uh9gEsFs5ZNlznvM6_GyeKiAljmlmA/viewform";

// Formato Oficial de la Carta de Recomendación (Google Drive)
const CARTA_RECOMENDACION_URL = "https://drive.google.com/file/d/1S4yGZY9iC65vW2m9q4u5VGMtcS9wh_kn/view?usp=sharing";

// Limpiar fecha de nacimiento u otros prefijos que puedan estar en el nombre (ej. "19/07/1981 ROSA GARCÍA GALLEGOS")
const cleanVolunteerName = (name) => {
  if (!name) return '';
  return name.replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}\s*[-–—:]*\s*/, '').trim();
};

// Limpiar y normalizar teléfono para enlaces de WhatsApp (evita duplicar el código de país 51 si ya viene registrado con él)
export const normalizePeruvianPhone = (telefono) => {
  if (!telefono) return null;
  let digits = String(telefono).replace(/\D/g, '');
  if (!digits) return null;
  
  if (digits.startsWith('0051')) {
    digits = digits.slice(4);
  }
  
  // Si el número tiene prefijo 51 y supera los 9 dígitos habituales de un celular en Perú, removemos el 51
  while (digits.startsWith('51') && digits.length > 9) {
    digits = digits.slice(2);
  }
  
  return digits;
};

// Generar enlace directo a WhatsApp con mensaje personalizado incluyendo el enlace al formulario oficial, carta de recomendación y portal de consulta
const getWhatsAppContactUrl = (telefono, nombres) => {
  const cleanPhone = normalizePeruvianPhone(telefono);
  if (!cleanPhone) return null;
  const name = cleanVolunteerName(nombres);
  const msg = `¡Hola *${name}*! 👋\n\nTe saludamos con alegría del equipo de Voluntariado de la *Diócesis de Chiclayo* para la Visita del Santo Padre 🕊️✨.\n\nNotamos que estás registrado/a en el Padrón General, pero aún no registramos tus documentos de la *Fase 2*.\n\n📄 *Sube tu documentación en el siguiente formulario oficial:*\n${GOOGLE_FORM_URL}\n\n📥 *Descarga aquí el formato oficial de la Carta de Recomendación:*\n${CARTA_RECOMENDACION_URL}\n\n🔍 *Si ya enviaste tu documentación o deseas dar seguimiento a tu postulación, valida tu estado aquí:*\n${PORTAL_CONSULTA_URL}\n\n¡Muchas gracias por tu compromiso y vocación de servicio! 🙏✨`;
  // Usamos directamente api.whatsapp.com/send para evitar que el redireccionador wa.me corrompa los emojis UTF-8 en rombos
  return `https://api.whatsapp.com/send/?phone=51${cleanPhone}&text=${encodeURIComponent(msg)}`;
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  
  // Pestaña activa: 'fase2' (Google Forms), 'fase1' (Padrón General), o 'sin_fase2' (Pendientes de enviar Fase 2)
  const [activeTab, setActiveTab] = useState('fase2');

  // Datos y paginación
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // Para Fase 2: 'ALL', 'SELECCIONADO', 'EN REVISIÓN', 'NO SELECCIONADO', 'PENDIENTE'
  const [fase1Filter, setFase1Filter] = useState('ALL'); // Para Fase 1: 'ALL', 'SIN_FASE2', 'CON_FASE2'
  const [contactFilter, setContactFilter] = useState('ALL'); // Para Sin Fase 2: 'ALL', 'NO_CONTACTADOS', 'CONTACTADOS'
  const [collaboratorFilter, setCollaboratorFilter] = useState('ALL'); // 'ALL', 'UNASSIGNED', o nombre del colaborador
  const [jurisdiccionFilter, setJurisdiccionFilter] = useState('ALL'); // 'ALL', 'Santa Cruz', 'Chiclayo', etc.
  const [updatingId, setUpdatingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal de Reparto y Colaboradores
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [collaboratorNamesInput, setCollaboratorNamesInput] = useState('');
  const [distributing, setDistributing] = useState(false);
  const [distributeMsg, setDistributeMsg] = useState(null);
  const [collaboratorsStats, setCollaboratorsStats] = useState([]);
  const [loadingCollabStats, setLoadingCollabStats] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Modal de Solicitudes de Acceso (Exclusivo Administrador - Estilo Jufra)
  const [showSolicitudesModal, setShowSolicitudesModal] = useState(false);
  const [solicitudesData, setSolicitudesData] = useState({ pendientes: [], aprobados: [], totalPendientes: 0 });
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [solicitudActionMsg, setSolicitudActionMsg] = useState(null);
  const [solicitudesTab, setSolicitudesTab] = useState('pendientes'); // 'pendientes' | 'activos' | 'auditoria'
  const [selectedUserRoles, setSelectedUserRoles] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Modal de Confirmación de Eliminación (Exclusivo Administrador)
  const [volunteerToDelete, setVolunteerToDelete] = useState(null); // { record, fase }
  const [deletingVolunteer, setDeletingVolunteer] = useState(false);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState(null);
  // Estados para Edición de Voluntario (Exclusivo Administrador)
  const [volunteerToEdit, setVolunteerToEdit] = useState(null); // { record, fase }
  const [editForm, setEditForm] = useState({});
  const [savingVolunteer, setSavingVolunteer] = useState(false);
  const [editSuccessToast, setEditSuccessToast] = useState(null);

  // Estadísticas globales (KPIs)
  const [stats, setStats] = useState({
    generalTotal: 7956,
    fase2Total: 0,
    seleccionados: 0,
    enRevision: 0,
    noSeleccionados: 0,
    pendientes: 0,
    sinFase2: 5929,
    conFase2: 2027,
    contactados: 0,
    sinContactar: 5929,
    sinWhatsapp: 0
  });

  // Estado de sincronización en vivo
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  // Estado para exportación dinámica a Excel
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Modal de detalle
  const [selectedVoluntario, setSelectedVoluntario] = useState(null);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1); // Reset a primera página al buscar
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset de página al cambiar de pestaña o filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, fase1Filter, contactFilter, collaboratorFilter, jurisdiccionFilter]);

  // Cargar estadísticas globales una sola vez o al sincronizar
  const fetchGlobalStats = useCallback(async () => {
    try {
      const [
        { count: generalCount },
        { count: f2Total },
        { count: selCount },
        { count: revCount },
        { count: noSelCount },
        { count: pendCount },
        { count: sinF2Count },
        { count: contactadosCount },
        { count: sinWhatsappCount }
      ] = await Promise.all([
        supabase.from('voluntarios_general').select('*', { count: 'exact', head: true }),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('estado', 'SELECCIONADO'),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('estado', 'EN REVISIÓN'),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).eq('estado', 'NO SELECCIONADO'),
        supabase.from('voluntarios').select('*', { count: 'exact', head: true }).or('estado.eq.PENDIENTE,estado.is.null'),
        supabase.from('voluntarios_general').select('*', { count: 'exact', head: true }).or('estado.eq.SIN_FASE2,estado.eq.CONTACTADO'),
        supabase.from('voluntarios_general').select('*', { count: 'exact', head: true }).eq('estado', 'CONTACTADO'),
        supabase.from('voluntarios_general').select('*', { count: 'exact', head: true }).eq('tiene_whatsapp', false)
      ]);

      const gTotal = generalCount || 7241;
      const sinF2 = sinF2Count ?? 5214;
      const contactados = contactadosCount || 0;
      const sinContactar = Math.max(0, sinF2 - contactados);
      const conF2 = gTotal - sinF2;

      setStats({
        generalTotal: gTotal,
        fase2Total: f2Total || 0,
        seleccionados: selCount || 0,
        enRevision: revCount || 0,
        noSeleccionados: noSelCount || 0,
        pendientes: pendCount || 0,
        sinFase2: sinF2,
        conFase2: conF2,
        contactados: contactados,
        sinContactar: sinContactar,
        sinWhatsapp: sinWhatsappCount || 0
      });
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  }, []);

  useEffect(() => {
    fetchGlobalStats();
  }, [fetchGlobalStats]);

  // Cargar registros paginados según la pestaña activa
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const isFase2 = activeTab === 'fase2';
      const tableName = isFase2 ? 'voluntarios' : 'voluntarios_general';
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from(tableName).select('*', { count: 'exact' });

      // Filtro de búsqueda por DNI o Nombres
      if (debouncedSearch) {
        // Si son solo números, busca directo por DNI exacto o prefijo
        if (/^\d+$/.test(debouncedSearch)) {
          query = query.ilike('dni', `%${debouncedSearch}%`);
        } else {
          query = query.or(`nombres_apellidos.ilike.%${debouncedSearch}%,dni.ilike.%${debouncedSearch}%`);
        }
      }

      // Filtro de estado para Fase 2
      if (isFase2 && statusFilter !== 'ALL') {
        if (statusFilter === 'PENDIENTE') {
          query = query.or('estado.eq.PENDIENTE,estado.is.null');
        } else {
          query = query.eq('estado', statusFilter);
        }
      }

      // Filtro para pestaña exclusiva 'sin_fase2'
      if (activeTab === 'sin_fase2') {
        if (contactFilter === 'CONTACTADOS') {
          query = query.eq('estado', 'CONTACTADO');
        } else if (contactFilter === 'NO_CONTACTADOS') {
          query = query.eq('estado', 'SIN_FASE2');
        } else if (contactFilter === 'SIN_WHATSAPP') {
          query = query.eq('tiene_whatsapp', false).or('estado.eq.SIN_FASE2,estado.eq.CONTACTADO');
        } else {
          query = query.or('estado.eq.SIN_FASE2,estado.eq.CONTACTADO');
        }
      }

      // Filtro desplegable dentro de pestaña 'fase1'
      if (activeTab === 'fase1' && fase1Filter !== 'ALL') {
        if (fase1Filter === 'SIN_FASE2') {
          query = query.or('estado.eq.SIN_FASE2,estado.eq.CONTACTADO');
        } else if (fase1Filter === 'SIN_WHATSAPP') {
          query = query.eq('tiene_whatsapp', false);
        } else {
          query = query.eq('estado', fase1Filter);
        }
      }

      // Filtro por colaborador asignado (solo para Fase 1 y Sin Fase 2)
      if (activeTab !== 'fase2' && collaboratorFilter !== 'ALL') {
        if (collaboratorFilter === 'UNASSIGNED') {
          query = query.or('fase.is.null,fase.eq.Sin asignar');
        } else {
          query = query.eq('fase', collaboratorFilter);
        }
      }

      // Filtro por Jurisdicción (para Fase 1, Sin Fase 2, y Fase 2)
      if (jurisdiccionFilter !== 'ALL') {
        query = query.ilike('jurisdiccion', `%${jurisdiccionFilter}%`);
      }

      // Orden y rango de paginación
      query = query.order('nombres_apellidos', { ascending: true }).range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setRecords(data || []);
      setTotalRecords(count || 0);
    } catch (err) {
      console.error('Error consultando registros:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, pageSize, debouncedSearch, statusFilter, fase1Filter, contactFilter, collaboratorFilter, jurisdiccionFilter]);

  // Enviar evento de auditoría en segundo plano
  const sendAudit = (accion, detalles) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      fetch(`${apiUrl}/api/auditoria`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ accion, detalles })
      }).catch(e => console.warn('Audit error:', e));
    } catch (e) {}
  };

  // Exportar a Excel según los filtros activos en tiempo real
  const handleExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    setExportProgress(0);

    try {
      const isFase2 = activeTab === 'fase2';
      const tableName = isFase2 ? 'voluntarios' : 'voluntarios_general';

      // 1. Construir la consulta respetando todos los filtros activos
      let query = supabase.from(tableName).select('*');

      if (debouncedSearch) {
        if (/^\d+$/.test(debouncedSearch)) {
          query = query.ilike('dni', `%${debouncedSearch}%`);
        } else {
          query = query.or(`nombres_apellidos.ilike.%${debouncedSearch}%,dni.ilike.%${debouncedSearch}%`);
        }
      }

      if (isFase2 && statusFilter !== 'ALL') {
        if (statusFilter === 'PENDIENTE') {
          query = query.or('estado.eq.PENDIENTE,estado.is.null');
        } else {
          query = query.eq('estado', statusFilter);
        }
      }

      if (activeTab === 'sin_fase2') {
        if (contactFilter === 'CONTACTADOS') {
          query = query.eq('estado', 'CONTACTADO');
        } else if (contactFilter === 'NO_CONTACTADOS') {
          query = query.eq('estado', 'SIN_FASE2');
        } else if (contactFilter === 'SIN_WHATSAPP') {
          query = query.eq('tiene_whatsapp', false).or('estado.eq.SIN_FASE2,estado.eq.CONTACTADO');
        } else {
          query = query.or('estado.eq.SIN_FASE2,estado.eq.CONTACTADO');
        }
      }

      if (activeTab === 'fase1' && fase1Filter !== 'ALL') {
        if (fase1Filter === 'SIN_FASE2') {
          query = query.or('estado.eq.SIN_FASE2,estado.eq.CONTACTADO');
        } else if (fase1Filter === 'SIN_WHATSAPP') {
          query = query.eq('tiene_whatsapp', false);
        } else {
          query = query.eq('estado', fase1Filter);
        }
      }

      if (activeTab !== 'fase2' && collaboratorFilter !== 'ALL') {
        if (collaboratorFilter === 'UNASSIGNED') {
          query = query.or('fase.is.null,fase.eq.Sin asignar');
        } else {
          query = query.eq('fase', collaboratorFilter);
        }
      }

      if (jurisdiccionFilter !== 'ALL') {
        query = query.ilike('jurisdiccion', `%${jurisdiccionFilter}%`);
      }

      query = query.order('nombres_apellidos', { ascending: true });

      // 2. Descargar en lotes de 1000
      let allExportRows = [];
      let page = 0;
      const batchSize = 1000;

      while (true) {
        const { data: chunk, error } = await query.range(page * batchSize, (page + 1) * batchSize - 1);
        if (error) throw error;
        if (!chunk || chunk.length === 0) break;
        allExportRows.push(...chunk);
        setExportProgress(allExportRows.length);
        if (chunk.length < batchSize) break;
        page++;
      }

      if (allExportRows.length === 0) {
        alert('No se encontraron registros con los filtros seleccionados.');
        return;
      }

      // 3. Formatear datos para el archivo Excel
      const excelData = allExportRows.map((r, idx) => {
        if (isFase2) {
          return {
            'N°': idx + 1,
            'Código': r.codigo || '',
            'DNI / Documento': r.dni || '',
            'Nombres y Apellidos': r.nombres_apellidos || '',
            'Estado': r.estado || 'PENDIENTE',
            'Info Validada': r.info_validada ? 'SÍ' : 'NO',
            'Comisión / Servicio': r.servicio || '',
            'Área': r.departamento || '',
            'Teléfono': r.telefono || '',
            'Correo': r.correo || '',
            'Distrito': r.distrito || '',
            'Jurisdicción': r.jurisdiccion || '',
            'Talla': r.talla || '',
            'Observaciones': r.observacion || ''
          };
        } else {
          let estadoTexto = 'Pendiente de Contactar';
          if (r.estado === 'CONTACTADO') estadoTexto = 'Contactado';
          else if (r.estado === 'CON_FASE2') estadoTexto = 'Ya llenó Fase 2';

          return {
            'N°': idx + 1,
            'Código': r.codigo || '',
            'DNI / Documento': r.dni || '',
            'Nombres y Apellidos': r.nombres_apellidos || '',
            '¿Tiene WhatsApp?': r.tiene_whatsapp === false ? 'NO' : 'SÍ',
            'Estado de Contacto': estadoTexto,
            'Asignado a': r.fase || 'Sin asignar',
            'Teléfono / Celular': r.telefono || '',
            'Correo Electrónico': r.correo || '',
            'Edad': r.edad || '',
            'Fecha Nacimiento': r.fecha_nacimiento || '',
            'Departamento': r.departamento || '',
            'Provincia': r.provincia || '',
            'Distrito': r.distrito || '',
            'Dirección': r.direccion || '',
            'Jurisdicción': r.jurisdiccion || '',
            'Comisión / Servicio': r.servicio || '',
            'Talla': r.talla || '',
            'Líder de Comisión': r.lider_nombre || '',
            'Coordinador de Cuadrilla': r.coordinador_nombre || '',
            'Código Cuadrilla': r.cuadrilla_codigo || ''
          };
        }
      });

      // 4. Crear libro y hoja con SheetJS
      const ws = xlsx.utils.json_to_sheet(excelData);

      // Calcular anchos de columna automáticamente
      const colWidths = Object.keys(excelData[0] || {}).map(key => {
        let maxLen = key.length;
        for (let i = 0; i < Math.min(excelData.length, 50); i++) {
          const val = excelData[i][key];
          if (val) maxLen = Math.max(maxLen, String(val).length);
        }
        return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
      });
      ws['!cols'] = colWidths;

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, isFase2 ? 'Fase 2' : 'Voluntarios');

      // 5. Nombre descriptivo y limpio según los filtros
      let tag = activeTab;
      if (activeTab === 'sin_fase2') {
        if (contactFilter === 'SIN_WHATSAPP') tag = 'Sin_WhatsApp_Para_Correo';
        else if (contactFilter === 'CONTACTADOS') tag = 'Contactados';
        else if (contactFilter === 'NO_CONTACTADOS') tag = 'Pendientes_Contactar';
        else tag = 'Sin_Fase2';
      } else if (activeTab === 'fase1' && fase1Filter === 'SIN_WHATSAPP') {
        tag = 'Sin_WhatsApp_Para_Correo';
      }
      if (collaboratorFilter !== 'ALL') {
        tag += `_${collaboratorFilter.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
      if (jurisdiccionFilter !== 'ALL') {
        tag += `_${jurisdiccionFilter.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
      if (debouncedSearch) {
        tag += `_busqueda`;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Voluntariado_${tag}_${dateStr}.xlsx`;

      xlsx.writeFile(wb, filename);

      // 6. Registrar en el historial de auditoría
      sendAudit('EXPORTAR_EXCEL', {
        pestana: activeTab,
        filtroFase1: fase1Filter,
        filtroContacto: contactFilter,
        colaborador: collaboratorFilter,
        filtroJurisdiccion: jurisdiccionFilter,
        busqueda: debouncedSearch || null,
        totalExportados: excelData.length,
        archivo: filename
      });

    } catch (err) {
      console.error('Error al exportar a Excel:', err);
      alert('Error generando el archivo Excel: ' + err.message);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  // Cambiar estado de Contactado / No Contactado con el switch
  const handleToggleContactado = async (voluntario) => {
    if (voluntario.estado === 'CON_FASE2') return;

    const isCurrentlyContacted = voluntario.estado === 'CONTACTADO';
    const newEstado = isCurrentlyContacted ? 'SIN_FASE2' : 'CONTACTADO';

    setUpdatingId(voluntario.id);

    // Actualización optimista inmediata en la UI
    setRecords(prev => prev.map(r => r.id === voluntario.id ? { ...r, estado: newEstado } : r));
    if (selectedVoluntario && selectedVoluntario.id === voluntario.id) {
      setSelectedVoluntario(prev => ({ ...prev, estado: newEstado }));
    }

    try {
      const { error } = await supabase
        .from('voluntarios_general')
        .update({ estado: newEstado })
        .eq('id', voluntario.id);

      if (error) throw error;

      // Registrar evento de auditoría
      sendAudit('CAMBIO_CONTACTADO', {
        voluntario_id: voluntario.id,
        dni: voluntario.dni,
        nombres: voluntario.nombres_apellidos,
        nuevo_estado: newEstado
      });

      // Actualizar contadores globales
      setStats(prev => ({
        ...prev,
        contactados: isCurrentlyContacted ? Math.max(0, prev.contactados - 1) : prev.contactados + 1,
        sinContactar: isCurrentlyContacted ? prev.sinContactar + 1 : Math.max(0, prev.sinContactar - 1)
      }));
    } catch (err) {
      console.error('Error al actualizar estado de contacto:', err);
      // Revertir en caso de error
      setRecords(prev => prev.map(r => r.id === voluntario.id ? { ...r, estado: voluntario.estado } : r));
    } finally {
      setUpdatingId(null);
    }
  };

  // Cambiar estado de ¿Tiene WhatsApp? (Sí / No) con switch
  const handleToggleTieneWhatsApp = async (voluntario) => {
    const currentVal = voluntario.tiene_whatsapp !== false;
    const newVal = !currentVal;

    setUpdatingId(`wa_${voluntario.id}`);

    // Actualización optimista inmediata en la UI
    setRecords(prev => prev.map(r => r.id === voluntario.id ? { ...r, tiene_whatsapp: newVal } : r));
    if (selectedVoluntario && selectedVoluntario.id === voluntario.id) {
      setSelectedVoluntario(prev => ({ ...prev, tiene_whatsapp: newVal }));
    }

    try {
      const { error } = await supabase
        .from('voluntarios_general')
        .update({ tiene_whatsapp: newVal })
        .eq('id', voluntario.id);

      if (error) throw error;

      // Registrar evento de auditoría
      sendAudit('CAMBIO_WHATSAPP', {
        voluntario_id: voluntario.id,
        dni: voluntario.dni,
        nombres: voluntario.nombres_apellidos,
        tiene_whatsapp: newVal
      });

      // Actualizar contadores globales de sinWhatsapp
      setStats(prev => ({
        ...prev,
        sinWhatsapp: newVal === false ? prev.sinWhatsapp + 1 : Math.max(0, prev.sinWhatsapp - 1)
      }));
    } catch (err) {
      console.error('Error al actualizar tiene_whatsapp:', err);
      // Revertir en caso de error
      setRecords(prev => prev.map(r => r.id === voluntario.id ? { ...r, tiene_whatsapp: currentVal } : r));
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Función para forzar sincronización con Google Sheets en el backend
  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncMsg('Sincronizando con Google Sheets...');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/sync-fase2`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMsg(`✅ Sincronizado: ${data.total} procesados (${data.saved} guardados).`);
        await fetchGlobalStats();
        await fetchRecords();
      } else {
        setSyncMsg('⚠️ Nota: La sincronización en segundo plano sigue activa.');
        await fetchGlobalStats();
        await fetchRecords();
      }
    } catch (e) {
      setSyncMsg('✅ Actualizando datos...');
      await fetchGlobalStats();
      await fetchRecords();
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  // Cargar estadísticas de avance de cada colaborador
  const fetchCollaboratorsStats = useCallback(async () => {
    setLoadingCollabStats(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const res = await fetch(`${apiUrl}/api/collaborators-stats`);
      const data = await res.json();
      if (res.ok) {
        const statsList = Array.isArray(data) ? data : (data.stats || []);
        setCollaboratorsStats(statsList.filter(s => s.name && s.name !== 'Sin asignar'));
      }
    } catch (err) {
      console.error('Error fetching collaborator stats:', err);
    } finally {
      setLoadingCollabStats(false);
    }
  }, []);

  useEffect(() => {
    fetchCollaboratorsStats();
  }, [fetchCollaboratorsStats]);

  // Ejecutar reparto equitativo
  const handleDistribute = async () => {
    const rawNames = collaboratorNamesInput
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    const names = [...new Set(rawNames)];

    if (names.length === 0) {
      alert('Por favor ingresa al menos un nombre de colaborador.');
      return;
    }

    setDistributing(true);
    setDistributeMsg({ type: 'info', text: `Repartiendo equitativamente entre ${names.length} colaboradores...` });
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/distribute-voluntarios`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ collaborators: names })
      });
      const data = await res.json();
      if (res.ok && (data.success || Array.isArray(data))) {
        setDistributeMsg({ 
          type: 'success', 
          text: `¡Reparto completado con éxito! Se asignaron ${(data.total || data.totalDistributed)?.toLocaleString() || 'los'} postulantes pendientes entre ${data.collaborators?.length || names.length} personas (respetando a los ya contactados).` 
        });
        await fetchCollaboratorsStats();
        await fetchRecords();
        await fetchGlobalStats();
      } else {
        setDistributeMsg({ 
          type: 'error', 
          text: `Error: ${data.error || 'No se pudo completar el reparto.'}` 
        });
      }
    } catch (err) {
      console.error('Error al repartir:', err);
      setDistributeMsg({ 
        type: 'error', 
        text: `Error de conexión: ${err.message}` 
      });
    } finally {
      setDistributing(false);
    }
  };

  // Cargar solicitudes de usuarios si el perfil conectado es Administrador
  const fetchSolicitudes = useCallback(async () => {
    if (user?.rol !== 'admin') return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const res = await fetch(`${apiUrl}/api/auth/solicitudes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSolicitudesData(data);
      }
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
    }
  }, [user?.rol]);

  // Cargar historial de auditoría de seguridad
  const fetchAuditLogs = useCallback(async () => {
    if (user?.rol !== 'admin') return;
    try {
      setLoadingAudit(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const res = await fetch(`${apiUrl}/api/auditoria?limit=150`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data || []);
      }
    } catch (err) {
      console.error('Error cargando auditoría:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, [user?.rol]);

  useEffect(() => {
    if (user?.rol === 'admin') {
      fetchSolicitudes();
    }
  }, [user?.rol, fetchSolicitudes]);

  // Aprobar solicitud de acceso
  const handleAprobarSolicitud = async (id, nombre, rol = 'comision') => {
    try {
      setLoadingSolicitudes(true);
      setSolicitudActionMsg(null);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const res = await fetch(`${apiUrl}/api/auth/solicitudes/${id}/aprobar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rol })
      });
      const data = await res.json();
      if (res.ok) {
        setSolicitudActionMsg({ type: 'success', text: `¡Acceso concedido a ${nombre}! Ya puede iniciar sesión.` });
        await fetchSolicitudes();
      } else {
        setSolicitudActionMsg({ type: 'error', text: data.msg || 'Error al aprobar usuario' });
      }
    } catch (err) {
      setSolicitudActionMsg({ type: 'error', text: err.message });
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Rechazar solicitud de acceso
  const handleRechazarSolicitud = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de que deseas rechazar la solicitud de ${nombre}?`)) return;
    try {
      setLoadingSolicitudes(true);
      setSolicitudActionMsg(null);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const res = await fetch(`${apiUrl}/api/auth/solicitudes/${id}/rechazar`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSolicitudActionMsg({ type: 'info', text: `Solicitud de ${nombre} rechazada.` });
        await fetchSolicitudes();
      } else {
        setSolicitudActionMsg({ type: 'error', text: data.msg || 'Error al rechazar' });
      }
    } catch (err) {
      setSolicitudActionMsg({ type: 'error', text: err.message });
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Eliminar usuario
  const handleEliminarUsuario = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${nombre}?`)) return;
    try {
      setLoadingSolicitudes(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const res = await fetch(`${apiUrl}/api/auth/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchSolicitudes();
      }
    } catch (err) {
      console.error('Error eliminando usuario:', err);
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Confirmar y procesar eliminación de voluntario (Exclusivo Administrador)
  const handleConfirmDeleteVolunteer = async () => {
    if (!volunteerToDelete || deletingVolunteer) return;
    setDeletingVolunteer(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const res = await fetch(`${apiUrl}/api/voluntarios/${volunteerToDelete.fase}/${volunteerToDelete.record.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          motivo: 'Eliminado por Administrador desde Dashboard (depuración de duplicado/postulación)'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.msg || 'No se pudo eliminar el registro');
      }

      // 1. Quitar registro de la tabla en pantalla
      setRecords(prev => prev.filter(r => r.id !== volunteerToDelete.record.id));
      setTotalRecords(prev => Math.max(0, prev - 1));

      // 2. Si la ficha completa estaba abierta con este voluntario, cerrarla
      if (selectedVoluntario?.id === volunteerToDelete.record.id) {
        setSelectedVoluntario(null);
      }

      // 3. Mostrar toast flotante de confirmación
      setDeleteSuccessToast({
        nombre: volunteerToDelete.record.nombres_apellidos,
        dni: volunteerToDelete.record.dni,
        fase: volunteerToDelete.fase === 'fase2' ? 'Fase 2 (Seleccionados / Oficial)' : 'Fase 1 (Padrón General)'
      });
      setTimeout(() => setDeleteSuccessToast(null), 6000);

      // 4. Actualizar contadores globales (KPIs)
      fetchGlobalStats();

      // 5. Cerrar modal de confirmación
      setVolunteerToDelete(null);
    } catch (err) {
      console.error('Error eliminando voluntario:', err);
      alert(`⚠️ Error al eliminar: ${err.message}`);
    } finally {
      setDeletingVolunteer(false);
    }
  };

    // Abrir modal de edición con los datos del voluntario
  const handleOpenEditVolunteer = (record, fase) => {
    setVolunteerToEdit({ record, fase });
    setEditForm({
      nombres_apellidos: record.nombres_apellidos || '',
      dni: record.dni || '',
      telefono: record.telefono || '',
      correo: record.correo || record.email || '',
      servicio: record.servicio || '',
      estado: record.estado || '',
      talla: record.talla || '',
      distrito: record.distrito || '',
      provincia: record.provincia || '',
      departamento: record.departamento || '',
      direccion: record.direccion || '',
      jurisdiccion: record.jurisdiccion || '',
      fecha_nacimiento: record.fecha_nacimiento || '',
      edad: record.edad || '',
      cuadrilla_codigo: record.cuadrilla_codigo || '',
      lider_nombre: record.lider_nombre || '',
      coordinador_nombre: record.coordinador_nombre || '',
      tiene_whatsapp: record.tiene_whatsapp !== false,
      fase: record.fase || '',
      ocupacion_laboral: record.ocupacion_laboral || ''
    });
  };

  // Guardar cambios del voluntario en backend y Supabase
  const handleSaveEditVolunteer = async (e) => {
    e?.preventDefault();
    if (!volunteerToEdit || savingVolunteer) return;
    setSavingVolunteer(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';
      const res = await fetch(`${apiUrl}/api/voluntarios/${volunteerToEdit.fase}/${volunteerToEdit.record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.msg || 'Error al actualizar el registro');
      }

      const updated = data.voluntario || { ...volunteerToEdit.record, ...editForm };

      // 1. Actualizar tabla en pantalla
      setRecords(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));

      // 2. Si la ficha completa estaba abierta, actualizarla
      if (selectedVoluntario?.id === updated.id) {
        setSelectedVoluntario(prev => ({ ...prev, ...updated }));
      }

      // 3. Notificación flotante de éxito
      setEditSuccessToast({
        nombre: updated.nombres_apellidos,
        dni: updated.dni
      });
      setTimeout(() => setEditSuccessToast(null), 5000);

      // 4. Cerrar modal de edición
      setVolunteerToEdit(null);
    } catch (err) {
      console.error('Error guardando cambios:', err);
      alert(`⚠️ Error al guardar: ${err.message}`);
    } finally {
      setSavingVolunteer(false);
    }
  };

  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-800">
      
      {/* NAVBAR SUPERIOR */}
      <nav className="bg-diocesis-redDark text-white sticky top-0 z-40 shadow-lg border-b-2 border-diocesis-mustard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={import.meta.env.BASE_URL + 'logos/logo_comision_juventud.png'} 
              alt="Comisión Diocesana de Juventud" 
              className="w-10 h-10 object-contain drop-shadow"
            />
            <div>
              <span className="font-title font-bold text-lg md:text-xl tracking-wide text-white block leading-tight">
                Panel de Administración
              </span>
              <span className="text-xs text-diocesis-mustardLight font-medium">
                Diócesis de Chiclayo • Padrón de Voluntariado
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <a
              href={import.meta.env.BASE_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-stone-100 transition"
              title="Abrir Consulta Pública en nueva pestaña"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver Portal Público
            </a>

            {/* BOTÓN EXCLUSIVO ADMINISTRADOR: GESTIÓN DE SOLICITUDES DE ACCESO */}
            {user?.rol === 'admin' && (
              <button
                onClick={() => {
                  setShowSolicitudesModal(true);
                  setSolicitudActionMsg(null);
                  fetchSolicitudes();
                }}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow transition cursor-pointer"
                title="Gestión de Solicitudes y Cuentas de Acceso (Exclusivo Administrador)"
              >
                <Users className="w-4 h-4 text-stone-950" />
                <span className="hidden sm:inline">Solicitudes</span>
                {solicitudesData.totalPendientes > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow border-2 border-diocesis-redDark animate-pulse">
                    {solicitudesData.totalPendientes}
                  </span>
                )}
              </button>
            )}

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-stone-200">{user?.nombre || user?.correo || user?.email}</span>
              <span className="text-[10px] text-diocesis-mustard uppercase font-semibold">
                {user?.rol === 'admin' ? 'Administrador' : 'Comisión'}
              </span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-diocesis-red hover:bg-diocesis-redLight text-white shadow transition cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* TARJETAS DE ESTADÍSTICAS (KPIS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
          
          {/* Total Fase 1 General */}
          <button
            onClick={() => { setActiveTab('fase1'); setFase1Filter('ALL'); }}
            className={`text-left rounded-2xl p-3.5 border transition flex flex-col justify-between ${
              activeTab === 'fase1' && fase1Filter === 'ALL'
                ? 'bg-stone-50 border-diocesis-mustard ring-2 ring-diocesis-mustard/30 shadow-sm'
                : 'bg-white border-stone-200 shadow-sm hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Padrón Fase 1</span>
              <Database className="w-3.5 h-3.5 text-stone-400" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-stone-800">
              {stats.generalTotal.toLocaleString()}
            </div>
            <span className="text-[10px] text-stone-500 mt-1">Inscritos Iniciales</span>
          </button>

          {/* Sin Enviar Fase 2 (Por Contactar) */}
          <button
            onClick={() => { setActiveTab('sin_fase2'); }}
            className={`text-left rounded-2xl p-3.5 border transition flex flex-col justify-between ${
              activeTab === 'sin_fase2' || (activeTab === 'fase1' && fase1Filter === 'SIN_FASE2')
                ? 'bg-amber-100/80 border-amber-500 ring-2 ring-amber-400/40 shadow-sm'
                : 'bg-amber-50/70 border-amber-200 shadow-sm hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Sin Enviar F2</span>
              <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-amber-800">
              {stats.sinFase2.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-700 font-bold mt-1">⚠️ Por contactar</span>
          </button>

          {/* Total Fase 2 Forms */}
          <button
            onClick={() => { setActiveTab('fase2'); setStatusFilter('ALL'); }}
            className={`text-left rounded-2xl p-3.5 border transition flex flex-col justify-between ${
              activeTab === 'fase2'
                ? 'bg-stone-50 border-diocesis-redDark ring-2 ring-diocesis-red/30 shadow-sm'
                : 'bg-white border-diocesis-mustard/60 shadow-sm hover:border-diocesis-mustard'
            }`}
          >
            <div className="flex items-center justify-between text-diocesis-mustardDark mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Fase 2 Forms</span>
              <FolderOpen className="w-3.5 h-3.5 text-diocesis-mustard" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-diocesis-redDark">
              {stats.fase2Total.toLocaleString()}
            </div>
            <span className="text-[10px] text-diocesis-mustardDark font-medium mt-1">Expedientes Únicos</span>
          </button>

          {/* Seleccionados / Validados */}
          <button
            onClick={() => { setActiveTab('fase2'); setStatusFilter('SELECCIONADO'); }}
            className="text-left bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 shadow-sm hover:border-emerald-400 transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Seleccionados</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-emerald-700">
              {stats.seleccionados.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold mt-1">Pase a Etapa 3</span>
          </button>

          {/* En Revisión / Observados */}
          <button
            onClick={() => { setActiveTab('fase2'); setStatusFilter('EN REVISIÓN'); }}
            className="text-left bg-amber-50 rounded-2xl p-3.5 border border-amber-200 shadow-sm hover:border-amber-400 transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">En Revisión</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-amber-800">
              {stats.enRevision.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-700 font-semibold mt-1">Con Observación</span>
          </button>

          {/* No Seleccionados */}
          <button
            onClick={() => { setActiveTab('fase2'); setStatusFilter('NO SELECCIONADO'); }}
            className="text-left bg-rose-50 rounded-2xl p-3.5 border border-rose-200 shadow-sm hover:border-rose-400 transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-rose-800 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">No Selecc.</span>
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-rose-700">
              {stats.noSeleccionados.toLocaleString()}
            </div>
            <span className="text-[10px] text-rose-600 font-semibold mt-1">No admitidos</span>
          </button>

          {/* Pendientes Fase 2 */}
          <button
            onClick={() => { setActiveTab('fase2'); setStatusFilter('PENDIENTE'); }}
            className="text-left bg-stone-50 rounded-2xl p-3.5 border border-stone-200 shadow-sm hover:border-stone-400 transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-stone-600 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Pendientes F2</span>
              <Clock className="w-3.5 h-3.5 text-stone-500" />
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-stone-700">
              {stats.pendientes.toLocaleString()}
            </div>
            <span className="text-[10px] text-stone-500 font-semibold mt-1">Por evaluar</span>
          </button>
        </div>

        {/* BARRA DE CONTROL: PESTAÑAS, BUSCADOR Y ACCIONES */}
        <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-stone-200 space-y-4">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Pestañas de Navegación */}
            <div className="inline-flex flex-wrap p-1 bg-stone-100 rounded-2xl border border-stone-200 self-start gap-1">
              <button
                onClick={() => setActiveTab('fase2')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
                  activeTab === 'fase2'
                    ? 'bg-diocesis-redDark text-white shadow'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Fase 2: Google Forms
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'fase2' ? 'bg-diocesis-mustard text-diocesis-redDark' : 'bg-stone-200 text-stone-700'
                }`}>
                  {stats.fase2Total}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('fase1'); setFase1Filter('ALL'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
                  activeTab === 'fase1'
                    ? 'bg-diocesis-redDark text-white shadow'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Database className="w-4 h-4" />
                Fase 1: Padrón General
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'fase1' ? 'bg-diocesis-mustard text-diocesis-redDark' : 'bg-stone-200 text-stone-700'
                }`}>
                  {stats.generalTotal}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('sin_fase2'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
                  activeTab === 'sin_fase2'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/60'
                }`}
                title="Postulantes de Fase 1 que aún no envían documentación para Fase 2"
              >
                <PhoneCall className="w-4 h-4 text-amber-500" />
                ⚠️ Sin Enviar Fase 2
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'sin_fase2' ? 'bg-white text-amber-800' : 'bg-amber-200 text-amber-900'
                }`}>
                  {stats.sinFase2}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('mapa'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
                  activeTab === 'mapa'
                    ? 'bg-diocesis-redDark text-white shadow'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Planificador Táctico de Puntos en Sedes y Campo"
              >
                <MapPin className="w-4 h-4 text-diocesis-mustard" />
                Mapa Táctico & Sedes
              </button>

              <button
                onClick={() => { setActiveTab('jerarquia'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer ${
                  activeTab === 'jerarquia'
                    ? 'bg-diocesis-redDark text-white shadow'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Estructura Oficial y Cadena de Mandos (Responsables, Líderes y Guías)"
              >
                <Layers className="w-4 h-4 text-diocesis-mustard" />
                <span>Estructura & Mandos</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'jerarquia' ? 'bg-diocesis-mustard text-diocesis-redDark' : 'bg-stone-200 text-stone-700'
                }`}>
                  725
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('capacitacion'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
                  activeTab === 'capacitacion'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="Gestión de Banners, Afiches y Capacitaciones"
              >
                <Megaphone className="w-4 h-4 text-amber-500" />
                Banners & Capacitación
              </button>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap">
              {syncMsg && (
                <span className="text-xs font-semibold text-diocesis-mustardDark animate-pulse">
                  {syncMsg}
                </span>
              )}

              {/* Botón para abrir modal de reparto de equipo */}
              <button
                onClick={() => {
                  setShowDistributeModal(true);
                  fetchCollaboratorsStats();
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-diocesis-redDark to-diocesis-red hover:from-diocesis-red hover:to-diocesis-redLight text-white rounded-xl text-xs font-bold shadow-sm transition"
                title="Repartir postulantes sin Fase 2 entre los miembros del equipo"
              >
                <Users className="w-3.5 h-3.5 text-diocesis-mustard" />
                <span>Repartir Postulantes</span>
              </button>

              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 transition disabled:opacity-50"
                title="Sincronizar ahora con la hoja de Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-diocesis-red' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Sheets'}
              </button>
            </div>
          </div>

          {/* Filtros y Buscador */}
          {activeTab !== 'mapa' && activeTab !== 'capacitacion' && activeTab !== 'jerarquia' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-stone-100">
            
            {/* Buscador por DNI / Nombres */}
            <div className={`relative ${
              activeTab !== 'fase2' && collaboratorsStats.length > 0 
                ? 'md:col-span-3 lg:col-span-3' 
                : 'md:col-span-4 lg:col-span-4'
            }`}>
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por DNI o Nombres..."
                className="w-full pl-10 pr-9 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-diocesis-mustard focus:bg-white transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtro de estado según la pestaña activa */}
            {activeTab === 'fase2' ? (
              <div className="md:col-span-3 lg:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full py-2.5 px-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
                >
                  <option value="ALL">Todos los Estados (Fase 2)</option>
                  <option value="SELECCIONADO">✅ Solo Seleccionados ({stats.seleccionados})</option>
                  <option value="EN REVISIÓN">⚠️ En Revisión / Observados ({stats.enRevision})</option>
                  <option value="NO SELECCIONADO">❌ No Seleccionados ({stats.noSeleccionados})</option>
                  <option value="PENDIENTE">⏳ Pendientes ({stats.pendientes})</option>
                </select>
              </div>
            ) : activeTab === 'fase1' ? (
              <div className="md:col-span-3 lg:col-span-3">
                <select
                  value={fase1Filter}
                  onChange={(e) => setFase1Filter(e.target.value)}
                  className="w-full py-2.5 px-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
                >
                  <option value="ALL">Todos en Fase 1 ({stats.generalTotal})</option>
                  <option value="SIN_FASE2">⚠️ Sin enviar Fase 2 / Por contactar ({stats.sinFase2})</option>
                  <option value="CON_FASE2">✅ Ya enviaron Fase 2 ({stats.conFase2})</option>
                  <option value="SIN_WHATSAPP">❌ Sin WhatsApp / Para Correo ({stats.sinWhatsapp})</option>
                </select>
              </div>
            ) : (
              <div className="md:col-span-3 lg:col-span-3">
                <select
                  value={contactFilter}
                  onChange={(e) => setContactFilter(e.target.value)}
                  className="w-full py-2.5 px-3 bg-amber-50/70 border border-amber-300 rounded-xl text-sm font-semibold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">📋 Todos sin Fase 2 ({stats.sinFase2})</option>
                  <option value="NO_CONTACTADOS">⏳ Pendientes de Contactar ({stats.sinContactar})</option>
                  <option value="CONTACTADOS">📞 Ya Contactados ({stats.contactados})</option>
                  <option value="SIN_WHATSAPP">❌ Sin WhatsApp / Para Correo ({stats.sinWhatsapp})</option>
                </select>
              </div>
            )}

            {/* Filtro por Colaborador Asignado (solo para Fase 1 y Sin Fase 2) */}
            {activeTab !== 'fase2' && (
              <div className="md:col-span-2 lg:col-span-2">
                <select
                  value={collaboratorFilter}
                  onChange={(e) => {
                    setCollaboratorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full py-2.5 px-3 bg-purple-50/70 border border-purple-300 rounded-xl text-sm font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="ALL">👥 Colaboradores</option>
                  <option value="UNASSIGNED">⚪ Sin Asignar</option>
                  {collaboratorsStats.map(c => {
                    const faltan = c.pendientes || 0;
                    const hechos = c.contactados || 0;
                    return (
                      <option key={c.name} value={c.name}>
                        {faltan === 0 
                          ? `👤 ${c.name} (✓ ${hechos})` 
                          : `👤 ${c.name} (⏳ ${faltan} • ${hechos})`
                        }
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Filtro por Jurisdicción (para Fase 1, Sin Fase 2 y Fase 2) */}
            <div className={activeTab === 'fase2' ? 'md:col-span-3 lg:col-span-3' : 'md:col-span-2 lg:col-span-2'}>
              <select
                value={jurisdiccionFilter}
                onChange={(e) => {
                  setJurisdiccionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full py-2.5 px-3 rounded-xl text-sm font-semibold border transition focus:outline-none focus:ring-2 ${
                  jurisdiccionFilter !== 'ALL'
                    ? 'bg-amber-100/90 border-amber-400 text-amber-900 font-bold focus:ring-amber-500 shadow-xs'
                    : 'bg-stone-50 border-stone-300 text-stone-700 focus:ring-diocesis-mustard'
                }`}
              >
                <option value="ALL">🏛️ Todas las Jurisdicciones</option>
                <option value="Santa Cruz">📍 Santa Cruz – Chiclayo</option>
                <option value="Chiclayo">Chiclayo</option>
                <option value="Lima">Lima</option>
                <option value="Cusco">Cusco</option>
                <option value="Pucallpa">Pucallpa</option>
              </select>
            </div>

            {/* Selector de cantidad por página */}
            <div className="md:col-span-2 lg:col-span-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full py-2.5 px-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-diocesis-mustard"
              >
                <option value={25}>25 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>
            </div>
          </div>
          )}
        </div>

        {/* VISTA ESTRUCTURA Y CADENA DE MANDOS */}
        {activeTab === 'jerarquia' && (
          <GestionJerarquia />
        )}

        {/* VISTA GESTIÓN DE CAPACITACIONES */}
        {activeTab === 'capacitacion' && (
          <GestionCapacitacion />
        )}
{/* VISTA MAPA TÁCTICO & SEDES */}
        {activeTab === 'mapa' && (
          <div className="space-y-4">
            <MapaTactico 
              rol="admin"
              isAdmin={true}
              guiaNombre={user?.nombre || "Comisión Central"}
              liderNombre="Comisión Central"
            />
          </div>
        )}

        {/* TABLA DE REGISTROS (Fase 1, Fase 2, Sin Fase 2) */}
        {activeTab !== 'mapa' && activeTab !== 'capacitacion' && activeTab !== 'jerarquia' && (
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
          
          {/* Header de la Tabla */}
          <div className="px-6 py-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
            <div className="text-xs font-bold text-stone-600">
              Mostrando <span className="text-diocesis-redDark font-extrabold">{records.length}</span> de{' '}
              <span className="text-stone-900 font-extrabold">{totalRecords.toLocaleString()}</span> registros
              {debouncedSearch && <span className="text-stone-500 font-normal"> (filtrado por "{debouncedSearch}")</span>}
              <span className="text-stone-400 font-normal ml-2">• Página {currentPage} de {totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting || totalRecords === 0}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                title="Descargar todos los registros filtrados en formato Excel (.xlsx)"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Generando Excel ({exportProgress} / {totalRecords})...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                    <span>Exportar Excel ({totalRecords.toLocaleString()})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm border-collapse">
              <thead>
                <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-600 uppercase text-[11px] font-bold tracking-wider">
                  <th className="py-3 px-4">DNI</th>
                  <th className="py-3 px-4">Nombres y Apellidos</th>
                  <th className="py-3 px-4">Servicio / Comisión</th>
                  <th className="py-3 px-4">Contacto</th>
                  {activeTab === 'fase2' ? (
                    <>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-center">Documentos</th>
                      <th className="py-3 px-4 text-center">Acción</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4 text-center">Asignado a</th>
                      <th className="py-3 px-4 text-center">¿Contactado?</th>
                      <th className="py-3 px-4 text-center">¿Tiene WhatsApp?</th>
                      <th className="py-3 px-4 text-center">Estado Fase 2</th>
                      <th className="py-3 px-4">Distrito / Parroquia</th>
                      <th className="py-3 px-4 text-center">Talla</th>
                      <th className="py-3 px-4 text-center">Acción</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === 'fase2' ? 7 : 11} className="py-12 text-center text-stone-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-diocesis-mustard" />
                      <span className="font-semibold text-sm">Cargando registros...</span>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'fase2' ? 7 : 11} className="py-12 text-center text-stone-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                      <p className="font-bold text-stone-700">No se encontraron registros</p>
                      <p className="text-xs text-stone-400 mt-1">Prueba cambiando los términos de búsqueda o el filtro.</p>
                    </td>
                  </tr>
                ) : (
                  records.map((r, idx) => {
                    const isRejected = r.estado === 'NO SELECCIONADO' || (r.estado && r.estado.toUpperCase().includes('NO'));
                    const isApproved = !isRejected && (r.estado === 'SELECCIONADO' || r.info_validada);
                    const isRevision = !isRejected && r.estado === 'EN REVISIÓN';

                    const cleanPhone = normalizePeruvianPhone(r.telefono);

                    return (
                      <tr key={r.id || r.dni || idx} className="hover:bg-amber-50/40 transition">
                        {/* DNI */}
                        <td className="py-3 px-4 font-mono font-bold text-diocesis-redDark whitespace-nowrap">
                          {r.dni}
                        </td>

                        {/* Nombres y Apellidos */}
                        <td className="py-3 px-4 font-semibold text-stone-900">
                          <div>{cleanVolunteerName(r.nombres_apellidos)}</div>
                          {activeTab === 'fase2' && r.jurisdiccion && (
                            <div className="mt-0.5">
                              {r.jurisdiccion.toLowerCase().includes('santa cruz') ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  📍 Santa Cruz – Chiclayo
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400 font-medium">
                                  🏛️ {r.jurisdiccion}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Servicio */}
                        <td className="py-3 px-4 text-stone-600 text-xs">
                          {r.servicio || r.grupo_integra || <span className="text-stone-400 italic">No asignado</span>}
                        </td>

                        {/* Contacto con WhatsApp directo */}
                        <td className="py-3 px-4 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                                {r.telefono || '-'}
                                {r.tiene_whatsapp === false && (
                                  <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1 py-0.5 rounded border border-rose-200">
                                    Sin WA
                                  </span>
                                )}
                              </div>
                              <div className="text-stone-400 text-[11px] truncate max-w-[140px]">{r.correo || '-'}</div>
                            </div>
                            {cleanPhone && (
                              <a
                                href={getWhatsAppContactUrl(r.telefono, r.nombres_apellidos)}
                                target="_blank"
                                rel="noreferrer"
                                className={`p-1.5 rounded-lg transition flex items-center justify-center shrink-0 shadow-xs ${
                                  r.tiene_whatsapp === false
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200 opacity-70'
                                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                }`}
                                title={
                                  r.tiene_whatsapp === false
                                    ? 'Número marcado sin WhatsApp (hacer clic si se desea reintentar)'
                                    : 'Escribir por WhatsApp con enlace al formulario Fase 2'
                                }
                              >
                                <MessageCircle className={`w-4 h-4 ${r.tiene_whatsapp === false ? 'text-rose-500' : 'text-emerald-700'}`} />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Columnas según Fase activa */}
                        {activeTab === 'fase2' ? (
                          <>
                            {/* Estado Badge */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Seleccionado
                                </span>
                              ) : isRevision ? (
                                <span 
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                  title={r.observacion || 'Documentos en revisión'}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                  En Revisión
                                </span>
                              ) : isRejected ? (
                                <span 
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300"
                                  title={r.observacion || 'No admitido'}
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  No Seleccionado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600 border border-stone-200">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pendiente
                                </span>
                              )}
                            </td>

                            {/* Enlaces de Documentos */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {r.archivo_compromiso_url && (
                                  <a
                                    href={r.archivo_compromiso_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                                    title="Ver DNI / Pasaporte"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-diocesis-red" />
                                  </a>
                                )}
                                {r.archivo_cul_url && (
                                  <a
                                    href={r.archivo_cul_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                                    title="Ver CertiAdulto (CUL)"
                                  >
                                    <FileCheck className="w-3.5 h-3.5 text-diocesis-mustard" />
                                  </a>
                                )}
                                {r.archivo_carta_url && (
                                  <a
                                    href={r.archivo_carta_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition"
                                    title="Ver Carta de Compromiso"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                                  </a>
                                )}
                                {!r.archivo_compromiso_url && !r.archivo_cul_url && !r.archivo_carta_url && (
                                  <span className="text-stone-300 text-xs italic">-</span>
                                )}
                              </div>
                            </td>

                            {/* Ver Detalle y Eliminar (Solo Admin) */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                <button
                                  onClick={() => setSelectedVoluntario(r)}
                                  className="p-1.5 rounded-lg bg-diocesis-red/10 hover:bg-diocesis-red/20 text-diocesis-redDark font-semibold transition cursor-pointer"
                                  title="Ver Ficha Completa"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {user?.rol === 'admin' && (
                                  <>
                                  <button
                                    onClick={() => handleOpenEditVolunteer(r, 'fase2')}
                                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 transition cursor-pointer border border-amber-200/70"
                                    title="Editar datos del voluntario (Administrador)"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setVolunteerToDelete({ record: r, fase: 'fase2' })}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 transition cursor-pointer border border-rose-200/60"
                                    title="Eliminar este registro (Fase 2 / Seleccionados / Duplicados)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Colaborador asignado */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {r.fase && r.fase !== '1' && r.fase !== '2' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                  <Users className="w-3 h-3 text-purple-700" />
                                  {r.fase}
                                </span>
                              ) : (
                                <span className="text-stone-400 italic text-[11px]">
                                  Sin asignar
                                </span>
                              )}
                            </td>

                            {/* Switch ¿Contactado? */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {r.estado === 'CON_FASE2' || r.fase === '2' ? (
                                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Doc. Enviado
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={r.estado === 'CONTACTADO'}
                                    disabled={updatingId === r.id}
                                    onClick={() => handleToggleContactado(r)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                      r.estado === 'CONTACTADO' ? 'bg-emerald-600' : 'bg-stone-300'
                                    } ${updatingId === r.id ? 'opacity-40 cursor-wait' : ''}`}
                                    title={r.estado === 'CONTACTADO' ? 'Marcar como NO contactado' : 'Marcar como CONTACTADO'}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        r.estado === 'CONTACTADO' ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                  <span className={`text-[11px] font-bold ${r.estado === 'CONTACTADO' ? 'text-emerald-700' : 'text-stone-400'}`}>
                                    {r.estado === 'CONTACTADO' ? 'Sí' : 'No'}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Switch ¿Tiene WhatsApp? */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {r.estado === 'CON_FASE2' || r.fase === '2' ? (
                                <span className="text-stone-300 text-xs">-</span>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={r.tiene_whatsapp !== false}
                                    disabled={updatingId === `wa_${r.id}`}
                                    onClick={() => handleToggleTieneWhatsApp(r)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                      r.tiene_whatsapp !== false ? 'bg-emerald-600' : 'bg-rose-500'
                                    } ${updatingId === `wa_${r.id}` ? 'opacity-40 cursor-wait' : ''}`}
                                    title={r.tiene_whatsapp !== false ? 'Marcar como: Sin WhatsApp / Número no existe' : 'Marcar como: Tiene WhatsApp activo'}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        r.tiene_whatsapp !== false ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                  <span className={`text-[11px] font-bold ${r.tiene_whatsapp !== false ? 'text-emerald-700' : 'text-rose-600'}`}>
                                    {r.tiene_whatsapp !== false ? 'Sí' : 'No'}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Estado de envío a Fase 2 */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {r.estado === 'CON_FASE2' || r.fase === '2' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  Envió Fase 2
                                </span>
                              ) : (
                                <span 
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                  title="No ha enviado los documentos en el formulario de Fase 2"
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                                  Sin enviar Fase 2
                                </span>
                              )}
                            </td>

                            {/* Distrito y Código */}
                            <td className="py-3 px-4 text-xs text-stone-600">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{r.distrito || r.jurisdiccion || '-'}</span>
                                {r.jurisdiccion && r.jurisdiccion.toLowerCase().includes('santa cruz') && (
                                  <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    Santa Cruz
                                  </span>
                                )}
                              </div>
                              {r.codigo && <span className="text-[10px] text-stone-400 font-mono">Cód: {r.codigo}</span>}
                            </td>

                            {/* Talla */}
                            <td className="py-3 px-4 text-center font-bold text-xs text-stone-700">
                              {r.talla || '-'}
                            </td>

                            {/* Acción: Ver Ficha Completa y Eliminar (Solo Admin) */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                <button
                                  onClick={() => setSelectedVoluntario(r)}
                                  className="p-1.5 rounded-lg bg-diocesis-red/10 hover:bg-diocesis-red/20 text-diocesis-redDark font-semibold transition cursor-pointer"
                                  title="Ver Ficha Completa"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {user?.rol === 'admin' && (
                                  <>
                                  <button
                                    onClick={() => handleOpenEditVolunteer(r, 'fase1')}
                                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 transition cursor-pointer border border-amber-200/70"
                                    title="Editar datos del voluntario (Administrador)"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setVolunteerToDelete({ record: r, fase: 'fase1' })}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 transition cursor-pointer border border-rose-200/60"
                                    title="Eliminar este registro (Fase 1 / Padrón General)"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* BARRA DE PAGINACIÓN */}
          <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-stone-500 font-medium">
              Página <strong className="text-stone-800">{currentPage}</strong> de{' '}
              <strong className="text-stone-800">{totalPages}</strong> (Total:{' '}
              {totalRecords.toLocaleString()} voluntarios)
            </span>

            <div className="inline-flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || loading}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-700 disabled:opacity-40 transition"
                title="Primera página"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-700 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              
              <div className="px-3 py-1 bg-white border border-stone-300 rounded-lg text-xs font-extrabold text-diocesis-redDark">
                {currentPage}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-700 disabled:opacity-40 transition"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || loading}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-xs font-bold text-stone-700 disabled:opacity-40 transition"
                title="Última página"
              >
                »
              </button>
            </div>
          </div>
        </div>
        )}

      </main>

      {/* MODAL DETALLE DE VOLUNTARIO */}
      {selectedVoluntario && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-diocesis-mustard bg-stone-100 px-2 py-0.5 rounded-md">
                  Ficha de Postulante
                </span>
                <h3 className="text-lg md:text-xl font-bold font-title text-diocesis-redDark mt-1">
                  {cleanVolunteerName(selectedVoluntario.nombres_apellidos)}
                </h3>
                <p className="text-xs font-mono font-bold text-stone-500">
                  DNI: {selectedVoluntario.dni} {selectedVoluntario.codigo ? `• Código: ${selectedVoluntario.codigo}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {user?.rol === 'admin' && (
                  <button
                    onClick={() => {
                      const fase = activeTab === 'fase2' ? 'fase2' : 'fase1';
                      handleOpenEditVolunteer(selectedVoluntario, fase);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition cursor-pointer"
                    title="Editar datos de este voluntario"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-600" />
                    <span>Editar Ficha</span>
                  </button>
                )}
                <button
                onClick={() => setSelectedVoluntario(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
              </div>
            </div>

            {/* Datos del Voluntario */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-400 block text-[10px] font-semibold uppercase">Servicio / Comisión</span>
                <span className="font-bold text-stone-800">{selectedVoluntario.servicio || 'No asignado'}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-400 block text-[10px] font-semibold uppercase">Estado Actual</span>
                <span className={`font-bold ${
                  selectedVoluntario.estado === 'SELECCIONADO' ? 'text-emerald-700' :
                  selectedVoluntario.estado === 'EN REVISIÓN' ? 'text-amber-700' :
                  selectedVoluntario.estado === 'SIN_FASE2' ? 'text-amber-700' :
                  selectedVoluntario.estado === 'CON_FASE2' ? 'text-emerald-700' :
                  (selectedVoluntario.estado === 'NO SELECCIONADO' || (selectedVoluntario.estado && selectedVoluntario.estado.includes('NO'))) ? 'text-rose-700' : 'text-stone-700'
                }`}>
                  {selectedVoluntario.estado === 'SIN_FASE2' ? '⚠️ Sin enviar Fase 2' :
                   selectedVoluntario.estado === 'CON_FASE2' ? '✅ Envió Fase 2' :
                   (selectedVoluntario.estado || 'PENDIENTE')}
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-stone-400 block text-[10px] font-semibold uppercase">Teléfono</span>
                  <span className="font-bold text-stone-800">{selectedVoluntario.telefono || '-'}</span>
                </div>
                {selectedVoluntario.telefono && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={getWhatsAppContactUrl(selectedVoluntario.telefono, selectedVoluntario.nombres_apellidos)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition shadow-xs"
                      title="Escribir por WhatsApp con formulario"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-400 block text-[10px] font-semibold uppercase">Correo</span>
                <span className="font-bold text-stone-800 truncate block">{selectedVoluntario.correo || '-'}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-400 block text-[10px] font-semibold uppercase">Ubicación / Distrito</span>
                <span className="font-bold text-stone-800">
                  {[selectedVoluntario.distrito, selectedVoluntario.provincia].filter(Boolean).join(', ') || '-'}
                </span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl">
                <span className="text-stone-400 block text-[10px] font-semibold uppercase">Contacto Emergencia</span>
                <span className="font-bold text-stone-800">
                  {selectedVoluntario.contacto_emergencia ? `${selectedVoluntario.contacto_emergencia} (${selectedVoluntario.telefono_emergencia || ''})` : '-'}
                </span>
              </div>

              {/* Control de Contacto en Modal */}
              {selectedVoluntario.estado !== 'CON_FASE2' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 col-span-2">
                  <div>
                    <span className="text-amber-800 block text-[10px] font-bold uppercase tracking-wider">
                      Control de Contacto y Canales
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`font-bold text-xs ${selectedVoluntario.estado === 'CONTACTADO' ? 'text-emerald-700' : 'text-stone-600'}`}>
                        {selectedVoluntario.estado === 'CONTACTADO' ? '✅ Contactado/a' : '⏳ No contactado/a'}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className={`font-bold text-xs ${selectedVoluntario.tiene_whatsapp !== false ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {selectedVoluntario.tiene_whatsapp !== false ? '💬 Tiene WhatsApp' : '❌ Sin WhatsApp (Derivar a Correo)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Switch ¿Contactado? */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={selectedVoluntario.estado === 'CONTACTADO'}
                        disabled={updatingId === selectedVoluntario.id}
                        onClick={() => handleToggleContactado(selectedVoluntario)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          selectedVoluntario.estado === 'CONTACTADO' ? 'bg-emerald-600' : 'bg-stone-300'
                        } ${updatingId === selectedVoluntario.id ? 'opacity-50 cursor-wait' : ''}`}
                        title={selectedVoluntario.estado === 'CONTACTADO' ? 'Marcar como NO contactado' : 'Marcar como CONTACTADO'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            selectedVoluntario.estado === 'CONTACTADO' ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-bold text-stone-700">
                        {selectedVoluntario.estado === 'CONTACTADO' ? 'Contactado' : 'No'}
                      </span>
                    </div>

                    {/* Switch ¿Tiene WhatsApp? */}
                    <div className="flex items-center gap-1.5 pl-3 border-l border-amber-300">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={selectedVoluntario.tiene_whatsapp !== false}
                        disabled={updatingId === `wa_${selectedVoluntario.id}`}
                        onClick={() => handleToggleTieneWhatsApp(selectedVoluntario)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          selectedVoluntario.tiene_whatsapp !== false ? 'bg-emerald-600' : 'bg-rose-500'
                        } ${updatingId === `wa_${selectedVoluntario.id}` ? 'opacity-50 cursor-wait' : ''}`}
                        title={selectedVoluntario.tiene_whatsapp !== false ? 'Marcar como SIN WhatsApp' : 'Marcar como TIENE WhatsApp'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            selectedVoluntario.tiene_whatsapp !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-bold text-stone-700">
                        {selectedVoluntario.tiene_whatsapp !== false ? 'WA: Sí' : 'WA: No'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Observación si existe */}
            {selectedVoluntario.observacion && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  Observación Registrada:
                </span>
                <p className="text-amber-800 leading-relaxed font-medium">
                  {selectedVoluntario.observacion}
                </p>
              </div>
            )}

            {/* Documentos Adjuntos */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <span className="text-xs font-bold text-stone-700 block">
                {selectedVoluntario.archivo_compromiso_url || selectedVoluntario.archivo_cul_url || selectedVoluntario.archivo_carta_url
                  ? 'Documentos Subidos en Google Forms:'
                  : 'Estado de Documentación en Fase 2:'}
              </span>
              
              {selectedVoluntario.archivo_compromiso_url || selectedVoluntario.archivo_cul_url || selectedVoluntario.archivo_carta_url ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {selectedVoluntario.archivo_compromiso_url ? (
                    <a
                      href={selectedVoluntario.archivo_compromiso_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 transition"
                    >
                      <span className="truncate">DNI / Pasaporte</span>
                      <ExternalLink className="w-3.5 h-3.5 text-diocesis-red" />
                    </a>
                  ) : (
                    <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-400 italic text-center">
                      Sin DNI
                    </div>
                  )}

                  {selectedVoluntario.archivo_cul_url ? (
                    <a
                      href={selectedVoluntario.archivo_cul_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 transition"
                    >
                      <span className="truncate">CertiAdulto</span>
                      <ExternalLink className="w-3.5 h-3.5 text-diocesis-mustard" />
                    </a>
                  ) : (
                    <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-400 italic text-center">
                      Sin CUL
                    </div>
                  )}

                  {selectedVoluntario.archivo_carta_url ? (
                    <a
                      href={selectedVoluntario.archivo_carta_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 transition"
                    >
                      <span className="truncate">Carta Compromiso</span>
                      <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    </a>
                  ) : (
                    <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-400 italic text-center">
                      Sin Carta
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-bold flex items-center gap-1.5 text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Sin expediente enviado en Fase 2
                    </p>
                    <p className="text-amber-800 text-[11px]">
                      Este postulante completó la inscripción inicial pero aún no envía sus documentos.
                    </p>
                  </div>
                  {selectedVoluntario.telefono && (
                    <a
                      href={getWhatsAppContactUrl(selectedVoluntario.telefono, selectedVoluntario.nombres_apellidos)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-xs shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contactar por WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-stone-200/70 mt-3">
              {user?.rol === 'admin' && (
                <button
                  onClick={() => {
                    const targetFase = (activeTab === 'fase2' || selectedVoluntario.fase === '2' || selectedVoluntario.estado === 'SELECCIONADO') ? 'fase2' : 'fase1';
                    setVolunteerToDelete({
                      record: selectedVoluntario,
                      fase: targetFase
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer"
                  title="Eliminar definitivamente este registro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Registro</span>
                </button>
              )}
              <button
                onClick={() => setSelectedVoluntario(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer ml-auto"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE SEGURIDAD PARA ELIMINAR (EXCLUSIVO ADMINISTRADOR) */}
      {volunteerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Encabezado de Advertencia */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs border border-rose-200">
                <AlertTriangle className="w-6 h-6 text-rose-600 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-stone-900 leading-snug">
                  ¿Deseas eliminar este registro?
                </h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">
                  Acción irreversible de Administrador
                </p>
              </div>
            </div>

            {/* Ficha Resumen del Voluntario */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Voluntario / Postulante
                </span>
                <span className="font-extrabold text-sm text-stone-900 block leading-tight">
                  {cleanVolunteerName(volunteerToDelete.record.nombres_apellidos)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    DNI / Doc.
                  </span>
                  <span className="font-mono font-bold text-stone-800 text-xs">
                    {volunteerToDelete.record.dni}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Estado Actual
                  </span>
                  <span className={`font-bold ${
                    volunteerToDelete.record.estado === 'SELECCIONADO' ? 'text-emerald-700' :
                    volunteerToDelete.record.estado === 'NO SELECCIONADO' ? 'text-rose-700' : 'text-amber-700'
                  }`}>
                    {volunteerToDelete.record.estado || 'PENDIENTE'}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Origen / Ubicación
                </span>
                <span className="font-semibold text-stone-700">
                  {volunteerToDelete.fase === 'fase2' 
                    ? '📌 Fase 2 (Formulario Oficial / Seleccionados)' 
                    : '📋 Fase 1 (Padrón General)'}
                </span>
              </div>
            </div>

            {/* Advertencia explicativa */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
              ⚠️ <strong>Atención:</strong> Esta acción borrará el registro de la base de datos de la Diócesis. Es ideal para depurar inscripciones duplicadas, errores de DNI o postulaciones repetidas.
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deletingVolunteer}
                onClick={() => setVolunteerToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingVolunteer}
                onClick={handleConfirmDeleteVolunteer}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {deletingVolunteer ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, Eliminar Definitivamente</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* NOTIFICACIÓN FLOTANTE TRAS ELIMINAR */}
      {deleteSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-stone-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Registro eliminado exitosamente</p>
            <p className="text-stone-300 text-[11px]">
              {deleteSuccessToast.nombre} (DNI: {deleteSuccessToast.dni}) en {deleteSuccessToast.fase}
            </p>
          </div>
          <button
            onClick={() => setDeleteSuccessToast(null)}
            className="text-stone-400 hover:text-white p-1 ml-2 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MODAL DE REPARTO DE POSTULANTES */}
      {showDistributeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 my-8">
            
            {/* Cabecera del modal */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-diocesis-red/10 flex items-center justify-center text-diocesis-redDark">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold font-title text-stone-900 leading-tight">
                    Repartir Postulantes entre el Equipo
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Distribuye equitativamente a los {stats.sinFase2?.toLocaleString()} postulantes de Fase 1 para contacto telefónico o WhatsApp.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDistributeModal(false);
                  setDistributeMsg(null);
                }}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Credenciales de Acceso para el Equipo */}
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                  <Key className="w-3.5 h-3.5 text-amber-700" />
                  <span>Usuario Exclusivo para el Equipo de Contacto:</span>
                </div>
                <div className="text-xs text-stone-700 font-mono font-bold flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Correo: <strong className="text-diocesis-redDark">equipo@amigosdelpapa.pe</strong></span>
                  <span>Contraseña: <strong className="text-diocesis-redDark">Voluntarios2026*</strong></span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Comparte este acceso con tu equipo para que puedan ingresar y filtrar sus postulantes asignados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('Correo: equipo@amigosdelpapa.pe\nContraseña: Voluntarios2026*\nEnlace: https://voluntarios-web.onrender.com/login');
                  setCopiedCreds(true);
                  setTimeout(() => setCopiedCreds(false), 2500);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/70 text-amber-900 rounded-xl text-xs font-bold transition shadow-2xs shrink-0"
              >
                {copiedCreds ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCreds ? '¡Copiado!' : 'Copiar Acceso'}
              </button>
            </div>

            {/* Input Box para nombres de colaboradores */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Ingresa los nombres de los colaboradores:
              </label>
              <textarea
                value={collaboratorNamesInput}
                onChange={(e) => setCollaboratorNamesInput(e.target.value)}
                placeholder="Ejemplo: Carlos, María, Juan Pérez, Sofía Gómez (puedes pegarlos o separarlos por comas o saltos de línea)"
                rows={3}
                className="w-full p-3 bg-stone-50 border border-stone-300 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-diocesis-mustard focus:bg-white transition resize-none"
              />
              
              {/* Cálculo en vivo */}
              {(() => {
                const names = collaboratorNamesInput
                  .split(/[\n,]+/)
                  .map(n => n.trim())
                  .filter(n => n.length > 0);
                const uniqueCount = new Set(names).size;
                const totalPorRepartir = stats.sinContactar || 2266;
                const perPerson = uniqueCount > 0 ? Math.ceil(totalPorRepartir / uniqueCount) : 0;

                return (
                  <div className="space-y-1.5 px-1">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>
                        {uniqueCount > 0 ? (
                          <span className="font-semibold text-stone-700">
                            👥 {uniqueCount} colaborador{uniqueCount > 1 ? 'es' : ''} ingresado{uniqueCount > 1 ? 's' : ''} • ~
                            <strong className="text-diocesis-redDark">{perPerson.toLocaleString()}</strong> postulantes pendientes c/u
                          </span>
                        ) : (
                          'Escribe o pega los nombres para calcular el reparto automático.'
                        )}
                      </span>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        Pendientes por repartir: {totalPorRepartir.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium">
                      🔒 <strong>Protección activa:</strong> Los {stats.contactados?.toLocaleString() || '2,782'} postulantes que ya fueron contactados conservan a su colaborador original y no se modifican.
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Botón de acción para repartir */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDistribute}
                disabled={distributing || !collaboratorNamesInput.trim()}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-diocesis-redDark to-diocesis-red hover:from-diocesis-red hover:to-diocesis-redLight text-white font-bold rounded-2xl text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Users className={`w-4 h-4 ${distributing ? 'animate-spin' : ''}`} />
                {distributing ? 'Repartiendo equitativamente en la base de datos...' : '⚡ Iniciar Reparto Equitativo'}
              </button>
            </div>

            {/* Mensaje de estado de la operación */}
            {distributeMsg && (
              <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                distributeMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
                distributeMsg.type === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
                'bg-amber-50 text-amber-900 border border-amber-200 animate-pulse'
              }`}>
                {distributeMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> :
                 distributeMsg.type === 'error' ? <XCircle className="w-4 h-4 text-rose-600 shrink-0" /> :
                 <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />}
                <span>{distributeMsg.text}</span>
              </div>
            )}

            {/* Tabla de Avance y Estado del Equipo */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-stone-500" />
                  Avance en Vivo por Colaborador:
                </span>
                <button
                  type="button"
                  onClick={fetchCollaboratorsStats}
                  disabled={loadingCollabStats}
                  className="text-[11px] font-bold text-diocesis-redDark hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingCollabStats ? 'animate-spin' : ''}`} />
                  Actualizar tabla
                </button>
              </div>

              {collaboratorsStats.length === 0 ? (
                <div className="p-4 bg-stone-50 rounded-2xl text-center text-xs text-stone-400">
                  Aún no se ha realizado ningún reparto. Ingresa los nombres arriba y presiona "Iniciar Reparto Equitativo".
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto border border-stone-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-stone-100/90 sticky top-0 border-b border-stone-200 text-stone-600 font-bold">
                      <tr>
                        <th className="py-2 px-3">Colaborador</th>
                        <th className="py-2 px-3 text-center">Asignados</th>
                        <th className="py-2 px-3 text-center">Contactados</th>
                        <th className="py-2 px-3 text-center">Pendientes</th>
                        <th className="py-2 px-3 text-center">% Avance</th>
                        <th className="py-2 px-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {collaboratorsStats.map((c) => (
                        <tr key={c.name} className="hover:bg-amber-50/40">
                          <td className="py-2 px-3 font-bold text-stone-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                            {c.name}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-stone-700">
                            {c.total?.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">
                            {c.contactados?.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-stone-500">
                            {c.pendientes?.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 bg-stone-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, c.porcentaje)}%` }}
                                />
                              </div>
                              <span className="font-bold text-stone-700 text-[11px] w-8 text-right">
                                {c.porcentaje}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setCollaboratorFilter(c.name);
                                setActiveTab('sin_fase2');
                                setShowDistributeModal(false);
                              }}
                              className="text-[11px] font-bold text-diocesis-redDark hover:bg-diocesis-red/10 px-2 py-1 rounded-lg transition"
                              title={`Filtrar tabla por ${c.name}`}
                            >
                              Ver mis asignados →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDistributeModal(false);
                  setDistributeMsg(null);
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE GESTIÓN DE SOLICITUDES Y USUARIOS (EXCLUSIVO ADMINISTRADOR - ESTILO JUFRA) */}
      {showSolicitudesModal && user?.rol === 'admin' && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col space-y-4 animate-in fade-in zoom-in-95">
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200 shadow-inner">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-stone-900 leading-tight">
                    Aprobación de Cuentas y Accesos
                  </h3>
                  <p className="text-xs text-stone-500">
                    Control exclusivo del Administrador • Solicitudes del equipo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSolicitudesModal(false);
                  setSolicitudActionMsg(null);
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pestañas de Solicitudes y Auditoría */}
            <div className="grid grid-cols-3 p-1 bg-stone-100 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setSolicitudesTab('pendientes')}
                className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  solicitudesTab === 'pendientes'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Pendientes</span>
                {solicitudesData.totalPendientes > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {solicitudesData.totalPendientes}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSolicitudesTab('activos')}
                className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  solicitudesTab === 'activos'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Activos ({solicitudesData.aprobados?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSolicitudesTab('auditoria');
                  fetchAuditLogs();
                }}
                className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  solicitudesTab === 'auditoria'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Auditoría</span>
              </button>
            </div>

            {/* Mensajes de feedback */}
            {solicitudActionMsg && (
              <div className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 border ${
                solicitudActionMsg.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                  : solicitudActionMsg.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                {solicitudActionMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{solicitudActionMsg.text}</span>
              </div>
            )}

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh]">
              {solicitudesTab === 'pendientes' ? (
                solicitudesData.pendientes?.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                    <p className="text-sm font-bold text-stone-700">¡Al día! No hay solicitudes pendientes</p>
                    <p className="text-xs text-stone-400 max-w-sm mx-auto">
                      Cuando un colaborador cree su cuenta desde la pantalla de inicio, aparecerá aquí para que autorices su acceso.
                    </p>
                  </div>
                ) : (
                  solicitudesData.pendientes.map((s) => {
                    const cleanPhone = normalizePeruvianPhone(s.telefono);
                    const selectedRole = selectedUserRoles[s.id] || s.rol || 'comision';
                    return (
                      <div 
                        key={s.id} 
                        className={`p-4 rounded-2xl border space-y-3 transition ${
                          s.rol === 'responsable'
                            ? 'bg-amber-100/40 hover:bg-amber-100/70 border-amber-300 shadow-2xs'
                            : s.rol === 'lider'
                            ? 'bg-emerald-100/40 hover:bg-emerald-100/70 border-emerald-300 shadow-2xs'
                            : s.rol === 'guia'
                            ? 'bg-blue-100/40 hover:bg-blue-100/70 border-blue-300 shadow-2xs'
                            : s.inPadron 
                            ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border-emerald-200 shadow-2xs' 
                            : 'bg-amber-50/30 hover:bg-amber-50/60 border-amber-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full font-black text-sm flex items-center justify-center border shadow-inner ${
                              s.rol === 'responsable'
                                ? 'bg-amber-500 text-white border-amber-600'
                                : s.rol === 'lider'
                                ? 'bg-emerald-600 text-white border-emerald-700'
                                : s.rol === 'guia'
                                ? 'bg-blue-600 text-white border-blue-700'
                                : s.inPadron 
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                              {s.nombre?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-stone-900">{s.nombre}</span>
                                {s.dni && (
                                  <span className="text-[10px] bg-white text-stone-800 font-mono font-bold px-1.5 py-0.5 rounded border border-stone-300">
                                    DNI: {s.dni}
                                  </span>
                                )}
                                {s.rol === 'responsable' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded-lg border border-amber-400">
                                    🎖️ RESPONSABLE GENERAL
                                  </span>
                                )}
                                {s.rol === 'lider' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-400">
                                    🛡️ LÍDER DE SECTOR {s.responsable_nombre ? `(Resp: ${s.responsable_nombre})` : ''}
                                  </span>
                                )}
                                {s.rol === 'guia' && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-blue-200 text-blue-950 px-2 py-0.5 rounded-lg border border-blue-400">
                                    🤝 GUÍA DE CUADRILLA ({s.cuadrilla_codigo || 'CUA-???'})
                                  </span>
                                )}
                                {!['responsable', 'lider', 'guia'].includes(s.rol) && s.inPadron && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-300">
                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                    ✓ Voluntario en Padrón ({s.padronFase || 'Fase 1'}{s.padronDistrito ? ` • ${s.padronDistrito}` : ''})
                                  </span>
                                )}
                                {!['responsable', 'lider', 'guia'].includes(s.rol) && !s.inPadron && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-300">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    ⚠️ No registrado en Padrón (Externo)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-stone-500 flex items-center gap-2 flex-wrap mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-stone-400" />
                                  {s.correo}
                                </span>
                                {cleanPhone && (
                                  <a
                                    href={`https://api.whatsapp.com/send/?phone=51${cleanPhone}&text=${encodeURIComponent(`Hola ${s.nombre}, te saluda Daniel Herrera sobre tu solicitud de acceso al sistema de voluntariado.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-emerald-700 font-bold hover:underline bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-200"
                                    title="Escribir por WhatsApp"
                                  >
                                    <MessageCircle className="w-3 h-3 text-emerald-600" />
                                    {s.telefono}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <span className="text-[10px] text-stone-400 font-medium self-start sm:self-center">
                            {new Date(s.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Asignación de Rol y Botones de Aprobación */}
                        <div className="pt-2 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-stone-600">Asignar Rol:</span>
                            <select
                              value={selectedRole}
                              onChange={(e) => setSelectedUserRoles(prev => ({ ...prev, [s.id]: e.target.value }))}
                              className="text-xs py-1 px-2.5 bg-white border border-stone-300 rounded-xl font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="responsable">🎖️ Responsable General</option>
                              <option value="lider">🛡️ Líder de Sector</option>
                              <option value="guia">🤝 Guía de Cuadrilla</option>
                              <option value="comision">Comisión (Colaborador)</option>
                              <option value="admin">Administrador General</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleRechazarSolicitud(s.id, s.nombre)}
                              disabled={loadingSolicitudes}
                              className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition cursor-pointer"
                            >
                              Rechazar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAprobarSolicitud(s.id, s.nombre, selectedRole)}
                              disabled={loadingSolicitudes}
                              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Aprobar Acceso
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              ) : solicitudesTab === 'activos' ? (
                /* LISTA DE USUARIOS ACTIVOS */
                solicitudesData.aprobados?.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs">No hay usuarios registrados</div>
                ) : (
                  solicitudesData.aprobados.map((u) => {
                    const isCurrentUser = (user?.correo === u.correo || user?.email === u.correo);
                    return (
                      <div 
                        key={u.id} 
                        className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center ${
                            u.rol === 'admin' 
                              ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}>
                            {u.nombre?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-xs font-black text-stone-900 flex items-center gap-1.5 flex-wrap">
                              <span>{u.nombre}</span>
                              {u.dni && (
                                <span className="text-[9px] bg-stone-200 text-stone-700 font-mono font-bold px-1.5 py-0.2 rounded border border-stone-300">
                                  DNI: {u.dni}
                                </span>
                              )}
                              {u.inPadron ? (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-300">
                                  ✓ Padrón {u.padronFase || ''}
                                </span>
                              ) : (
                                <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                                  ⚠️ Externo
                                </span>
                              )}
                              {isCurrentUser && (
                                <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded-md font-bold">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              {u.correo} {u.telefono ? `• ${u.telefono}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                            u.rol === 'admin'
                              ? 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold'
                              : u.rol === 'responsable'
                              ? 'bg-amber-100 text-amber-950 border-amber-400 font-black'
                              : u.rol === 'lider'
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold'
                              : u.rol === 'guia'
                              ? 'bg-blue-100 text-blue-950 border-blue-400 font-bold'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {u.rol === 'admin' ? 'Administrador' 
                              : u.rol === 'responsable' ? '🎖️ Responsable'
                              : u.rol === 'lider' ? '🛡️ Líder'
                              : u.rol === 'guia' ? '🤝 Guía'
                              : 'Comisión'}
                          </span>

                          {!isCurrentUser && (
                            <button
                              type="button"
                              onClick={() => handleEliminarUsuario(u.id, u.nombre)}
                              disabled={loadingSolicitudes}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title={`Eliminar usuario ${u.nombre}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                /* HISTORIAL DE AUDITORÍA EN TIEMPO REAL */
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-amber-600" />
                      Trazabilidad de Acciones y Seguridad
                    </span>
                    <button
                      type="button"
                      onClick={fetchAuditLogs}
                      disabled={loadingAudit}
                      className="px-2.5 py-1 text-[11px] font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingAudit ? 'animate-spin' : ''}`} />
                      Actualizar
                    </button>
                  </div>

                  {loadingAudit ? (
                    <div className="text-center py-12 text-stone-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-stone-400" />
                      Cargando historial de auditoría...
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-xs text-stone-500">
                      Aún no hay registros de auditoría almacenados.
                    </div>
                  ) : (
                    auditLogs.map((log) => {
                      const dateObj = new Date(log.created_at);
                      const timeStr = !isNaN(dateObj) ? dateObj.toLocaleString('es-PE', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      }) : log.created_at;

                      const isPositive = log.accion.includes('APROBADO') || log.accion.includes('EXITOSO');
                      const isNegative = log.accion.includes('RECHAZADO') || log.accion.includes('ELIMINADO') || log.accion.includes('FALLIDO');
                      const d = log.detalles || {};

                      return (
                        <div 
                          key={log.id} 
                          className="p-2.5 bg-stone-50 hover:bg-white rounded-xl border border-stone-200 hover:border-amber-400 transition text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                                isPositive 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                  : isNegative 
                                  ? 'bg-rose-50 text-rose-800 border-rose-300' 
                                  : 'bg-amber-50 text-amber-900 border-amber-300'
                              }`}>
                                {log.accion.replace(/_/g, ' ')}
                              </span>
                              <span className="font-bold text-stone-800">
                                {log.usuario_nombre || 'Sistema'}
                              </span>
                              {log.usuario_correo && (
                                <span className="text-[10px] text-stone-400">({log.usuario_correo})</span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-stone-400 shrink-0">
                              {timeStr}
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-600 pl-1">
                            {log.accion === 'CAMBIO_CONTACTADO' && (
                              <span>
                                Voluntario: <strong className="text-stone-800">{d.nombres}</strong> (DNI: {d.dni}) &rarr; Marcado como <span className="font-bold text-emerald-700">{d.nuevo_estado === 'CONTACTADO' ? '✅ Contactado' : '⏳ Pendiente'}</span>
                              </span>
                            )}
                            {log.accion === 'CAMBIO_WHATSAPP' && (
                              <span>
                                Voluntario: <strong className="text-stone-800">{d.nombres}</strong> (DNI: {d.dni}) &rarr; WhatsApp: <span className="font-bold">{d.tiene_whatsapp ? '💬 Activo' : '❌ Sin WhatsApp'}</span>
                              </span>
                            )}
                            {log.accion === 'USUARIO_APROBADO' && (
                              <span>
                                Autorizó acceso a <strong className="text-stone-800">{d.nombre}</strong> (DNI: {d.dni || 'S/D'}) con rol <span className="font-bold">{d.rol}</span>
                              </span>
                            )}
                            {log.accion === 'USUARIO_RECHAZADO' && (
                              <span>
                                Rechazó solicitud de <strong className="text-stone-800">{d.nombre}</strong> (DNI: {d.dni || 'S/D'})
                              </span>
                            )}
                            {log.accion === 'USUARIO_ELIMINADO' && (
                              <span>
                                Eliminó permanentemente la cuenta de <strong className="text-stone-800">{d.nombre}</strong> (DNI: {d.dni || 'S/D'})
                              </span>
                            )}
                            {log.accion === 'LOGIN_EXITOSO' && (
                              <span>
                                Inicio de sesión seguro con {d.correo || d.dni} (Rol: {d.rol})
                              </span>
                            )}
                            {log.accion === 'LOGIN_FALLIDO' && (
                              <span className="text-rose-600">
                                Intento fallido con: {d.input} • {d.motivo || 'Credenciales incorrectas'}
                              </span>
                            )}
                            {log.accion === 'REGISTRO_SOLICITUD' && (
                              <span>
                                Nueva solicitud de <strong className="text-stone-800">{d.nombre}</strong> (DNI: {d.dni}) • {d.correo}
                              </span>
                            )}
                            {log.accion === 'REPARTO_VOLUNTARIOS' && (
                              <span>
                                Reparto masivo: {d.totalAsignados} voluntarios distribuidos equitativamente entre {d.totalColaboradores} colaboradores.
                              </span>
                            )}
                            {log.accion === 'REPARTO_CUADRILLAS' && (
                              <span>
                                Chocoloteo y distribución de cuadrillas: {d.totalAsignados} voluntarios asignados.
                              </span>
                            )}
                            {!['CAMBIO_CONTACTADO', 'CAMBIO_WHATSAPP', 'USUARIO_APROBADO', 'USUARIO_RECHAZADO', 'USUARIO_ELIMINADO', 'LOGIN_EXITOSO', 'LOGIN_FALLIDO', 'REGISTRO_SOLICITUD', 'REPARTO_VOLUNTARIOS', 'REPARTO_CUADRILLAS'].includes(log.accion) && (
                              <span className="font-mono text-[10px] text-stone-500">{JSON.stringify(d)}</span>
                            )}
                          </div>

                          {log.ip && (
                            <div className="text-[9px] text-stone-400 pl-1 font-mono">
                              IP: {log.ip}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[11px] text-stone-400">
                {solicitudesTab === 'pendientes' && `Pendientes: ${solicitudesData.totalPendientes || 0}`}
                {solicitudesTab === 'activos' && `Total activos: ${solicitudesData.totalAprobados || solicitudesData.aprobados?.length || 0}`}
                {solicitudesTab === 'auditoria' && `Registros mostrados: ${auditLogs.length}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowSolicitudesModal(false);
                  setSolicitudActionMsg(null);
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}


      {/* MODAL DE EDICIÓN DE VOLUNTARIO (EXCLUSIVO ADMINISTRADOR) */}
      {volunteerToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Cabecera del modal */}
            <div className="p-5 md:p-6 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-title">
                    Editar Datos del Voluntario
                  </h3>
                  <p className="text-xs text-stone-300">
                    Modificando en: {volunteerToEdit.fase === 'fase2' ? '📌 Fase 2 (Seleccionados / Oficial)' : '📋 Fase 1 (Padrón General)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !savingVolunteer && setVolunteerToEdit(null)}
                disabled={savingVolunteer}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario de edición */}
            <form onSubmit={handleSaveEditVolunteer} className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
              
              {/* Sección 1: Datos Personales */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-1">
                  1. Datos Personales e Identificación
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-stone-700 font-bold mb-1">Nombres y Apellidos *</label>
                    <input
                      type="text"
                      required
                      value={editForm.nombres_apellidos || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, nombres_apellidos: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">DNI / Documento *</label>
                    <input
                      type="text"
                      required
                      value={editForm.dni || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, dni: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Talla de Polo</label>
                    <select
                      value={editForm.talla || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, talla: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    >
                      <option value="">Seleccionar Talla...</option>
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Fecha de Nacimiento</label>
                    <input
                      type="text"
                      placeholder="DD/MM/AAAA o YYYY-MM-DD"
                      value={editForm.fecha_nacimiento || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Edad</label>
                    <input
                      type="number"
                      value={editForm.edad || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, edad: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Contacto y Ubicación */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-1">
                  2. Contacto y Residencia
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Celular / WhatsApp *</label>
                    <input
                      type="text"
                      value={editForm.telefono || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, telefono: e.target.value }))}
                      placeholder="9 dígitos"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={editForm.correo || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, correo: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Distrito</label>
                    <input
                      type="text"
                      value={editForm.distrito || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, distrito: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Jurisdicción / Parroquia</label>
                    <input
                      type="text"
                      value={editForm.jurisdiccion || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, jurisdiccion: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-stone-700 font-bold mb-1">Dirección Domiciliaria</label>
                    <input
                      type="text"
                      value={editForm.direccion || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, direccion: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Estado, Servicio y Asignación */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-1">
                  3. Estado, Comisión y Cuadrilla
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Estado de Postulación *</label>
                    {volunteerToEdit.fase === 'fase2' ? (
                      <select
                        value={editForm.estado || 'PENDIENTE'}
                        onChange={(e) => setEditForm(prev => ({ ...prev, estado: e.target.value }))}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                      >
                        <option value="SELECCIONADO">✅ SELECCIONADO (Aprobado)</option>
                        <option value="EN REVISIÓN">⏳ EN REVISIÓN</option>
                        <option value="NO SELECCIONADO">❌ NO SELECCIONADO</option>
                        <option value="PENDIENTE">⚠️ PENDIENTE</option>
                      </select>
                    ) : (
                      <select
                        value={editForm.estado || 'SIN_FASE2'}
                        onChange={(e) => setEditForm(prev => ({ ...prev, estado: e.target.value }))}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                      >
                        <option value="SIN_FASE2">Pendiente de Fase 2 (SIN_FASE2)</option>
                        <option value="CONTACTADO">Contactado por equipo (CONTACTADO)</option>
                        <option value="CON_FASE2">Ya completó Fase 2 (CON_FASE2)</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Comisión / Servicio</label>
                    <input
                      type="text"
                      value={editForm.servicio || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, servicio: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Código de Cuadrilla</label>
                    <input
                      type="text"
                      placeholder="Ej: CUAD-05"
                      value={editForm.cuadrilla_codigo || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, cuadrilla_codigo: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-bold mb-1">Líder de Sector Asignado</label>
                    <input
                      type="text"
                      value={editForm.lider_nombre || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, lider_nombre: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                    />
                  </div>

                  {volunteerToEdit.fase === 'fase1' && (
                    <>
                      <div>
                        <label className="block text-stone-700 font-bold mb-1">¿Tiene WhatsApp Activo?</label>
                        <select
                          value={editForm.tiene_whatsapp ? 'SI' : 'NO'}
                          onChange={(e) => setEditForm(prev => ({ ...prev, tiene_whatsapp: e.target.value === 'SI' }))}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                        >
                          <option value="SI">SÍ (Tiene WhatsApp)</option>
                          <option value="NO">NO (Solo llamadas / correo)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-stone-700 font-bold mb-1">Colaborador Asignado (Fase)</label>
                        <input
                          type="text"
                          value={editForm.fase || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, fase: e.target.value }))}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Botones de acción del formulario */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={savingVolunteer}
                  onClick={() => setVolunteerToEdit(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingVolunteer}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-diocesis-redDark to-diocesis-red hover:from-diocesis-red hover:to-red-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {savingVolunteer ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando Cambios en Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* NOTIFICACIÓN FLOTANTE TRAS EDITAR */}
      {editSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-stone-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Datos del voluntario actualizados</p>
            <p className="text-stone-300 text-[11px]">
              {editSuccessToast.nombre} (DNI: {editSuccessToast.dni}) guardado exitosamente.
            </p>
          </div>
          <button
            onClick={() => setEditSuccessToast(null)}
            className="text-stone-400 hover:text-white p-1 ml-2 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
