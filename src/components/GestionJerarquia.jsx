import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { 
  Users, 
  Search, 
  FileSpreadsheet, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  Phone, 
  Mail, 
  Shield, 
  Check, 
  X, 
  ExternalLink,
  Layers,
  Building2,
  UserCheck,
  Filter,
  CheckCircle2,
  AlertCircle,
  CloudDownload,
  UserPlus,
  UserMinus,
  RefreshCcw,
  CheckCheck
} from 'lucide-react';
import * as xlsx from 'xlsx';

const API_URL = import.meta.env.VITE_API_URL || 'https://voluntarios-backend.vercel.app';

export default function GestionJerarquia() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResp, setSelectedResp] = useState('ALL');
  const [selectedLider, setSelectedLider] = useState('ALL');
  const [filterContacto, setFilterContacto] = useState('ALL'); // 'ALL' | 'CON_TEL' | 'SIN_TEL' | 'CON_CORREO' | 'CON_CARTA'
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'table'
  
  // Control de acordeón
  const [expandedResp, setExpandedResp] = useState({});
  const [expandedLider, setExpandedLider] = useState({});

  // Estados para sincronización inteligente con Google Sheets
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [diffData, setDiffData] = useState(null);
  const [diffTab, setDiffTab] = useState('modificados'); // 'modificados' | 'agregados' | 'eliminados'
  const [syncApplying, setSyncApplying] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState(null);

  useEffect(() => {
    fetchEstructura();
  }, []);

  const fetchEstructura = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('estructura_mandos')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      const list = data || [];
      setRecords(list);

      // Abrir el primer responsable por defecto en modo árbol
      if (list.length > 0) {
        const firstResp = list[0].responsable_nombre;
        setExpandedResp({ [firstResp]: true });
      }
    } catch (err) {
      console.error('Error cargando estructura de mandos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manejo de Sincronización con Google Sheets (Diff Report previo)
  const handleAbrirSincronizacion = async () => {
    setSyncLoading(true);
    setSyncSuccessMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/estructura-mandos/analizar-cambios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo obtener el análisis de cambios');
      }
      setDiffData(data);
      if (data.summary?.modificados > 0) {
        setDiffTab('modificados');
      } else if (data.summary?.agregados > 0) {
        setDiffTab('agregados');
      } else if (data.summary?.eliminados > 0) {
        setDiffTab('eliminados');
      } else {
        setDiffTab('modificados');
      }
      setSyncModalOpen(true);
    } catch (err) {
      alert(`Error al analizar Google Sheets: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleAplicarSincronizacion = async () => {
    if (!window.confirm('¿Confirmas aplicar estos cambios a la estructura oficial? Se creará una tabla de respaldo automático antes de actualizar.')) {
      return;
    }
    setSyncApplying(true);
    try {
      const res = await fetch(`${API_URL}/api/estructura-mandos/aplicar-cambios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error aplicando sincronización');
      }
      setSyncSuccessMessage(data.message || 'Sincronización completada exitosamente.');
      await fetchEstructura();
      setTimeout(() => {
        setSyncModalOpen(false);
        setSyncSuccessMessage(null);
      }, 2000);
    } catch (err) {
      alert(`Error aplicando cambios: ${err.message}`);
    } finally {
      setSyncApplying(false);
    }
  };

  // Listas únicas para filtros
  const responsablesList = useMemo(() => {
    const set = new Set(records.map(r => r.responsable_nombre).filter(Boolean));
    return Array.from(set).sort();
  }, [records]);

  const lideresList = useMemo(() => {
    let pool = records;
    if (selectedResp !== 'ALL') {
      pool = pool.filter(r => r.responsable_nombre === selectedResp);
    }
    const set = new Set(pool.map(r => r.lider_nombre).filter(Boolean));
    return Array.from(set).sort();
  }, [records, selectedResp]);

  // Filtrado de registros
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Filtro por Responsable
      if (selectedResp !== 'ALL' && r.responsable_nombre !== selectedResp) return false;

      // Filtro por Líder
      if (selectedLider !== 'ALL' && r.lider_nombre !== selectedLider) return false;

      // Filtro por Contacto / Documento
      if (filterContacto === 'CON_TEL' && !r.guia_telefono) return false;
      if (filterContacto === 'SIN_TEL' && r.guia_telefono) return false;
      if (filterContacto === 'CON_CORREO' && !r.guia_correo) return false;
      if (filterContacto === 'CON_CARTA' && !r.guia_carta) return false;

      // Buscador general de texto
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchGuia = String(r.guia_nombre || '').toLowerCase().includes(term);
        const matchLider = String(r.lider_nombre || '').toLowerCase().includes(term);
        const matchResp = String(r.responsable_nombre || '').toLowerCase().includes(term);
        const matchDni = String(r.guia_dni || '').includes(term) || String(r.lider_dni || '').includes(term);
        const matchCod = String(r.cuadrilla_codigo || '').toLowerCase().includes(term);
        const matchTel = String(r.guia_telefono || '').includes(term);
        return matchGuia || matchLider || matchResp || matchDni || matchCod || matchTel;
      }

      return true;
    });
  }, [records, selectedResp, selectedLider, filterContacto, searchTerm]);

  // Estructurar en árbol (Responsable -> Líderes -> Guías)
  const treeData = useMemo(() => {
    const map = new Map();

    filteredRecords.forEach(r => {
      const respKey = r.responsable_nombre || 'SIN RESPONSABLE';
      if (!map.has(respKey)) {
        map.set(respKey, {
          nombre: respKey,
          dni: r.responsable_dni,
          telefono: r.responsable_telefono,
          correo: r.responsable_correo,
          carta: r.responsable_carta,
          totalCuadrillas: 0,
          totalCapacidad: 0,
          lideresMap: new Map()
        });
      }

      const rNode = map.get(respKey);
      rNode.totalCuadrillas++;
      rNode.totalCapacidad += (r.total_voluntarios || 9);

      const liderKey = r.lider_nombre || 'SIN LÍDER';
      if (!rNode.lideresMap.has(liderKey)) {
        rNode.lideresMap.set(liderKey, {
          nombre: liderKey,
          dni: r.lider_dni,
          telefono: r.lider_telefono,
          correo: r.lider_correo,
          carta: r.lider_carta,
          guias: []
        });
      }

      const lNode = rNode.lideresMap.get(liderKey);
      lNode.guias.push(r);
    });

    return Array.from(map.values()).map(r => ({
      ...r,
      lideres: Array.from(r.lideresMap.values())
    }));
  }, [filteredRecords]);

  // KPIs globales
  const stats = useMemo(() => {
    const respCount = new Set(records.map(r => r.responsable_nombre)).size;
    const liderCount = new Set(records.map(r => r.lider_nombre)).size;
    const totalCupos = records.reduce((acc, r) => acc + (r.total_voluntarios || 9), 0);
    const conTel = records.filter(r => r.guia_telefono).length;
    const conCorreo = records.filter(r => r.guia_correo).length;
    const conCarta = records.filter(r => r.guia_carta).length;

    return {
      responsables: respCount,
      lideres: liderCount,
      guias: records.length,
      cupos: totalCupos,
      conTel,
      pctTel: records.length ? Math.round((conTel / records.length) * 100) : 0,
      conCorreo,
      conCarta
    };
  }, [records]);

  // Exportar a Excel
  const handleExportExcel = () => {
    const rows = filteredRecords.map((r, i) => ({
      '#': i + 1,
      'Cuadrilla': r.cuadrilla_codigo,
      'Responsable Territorial': r.responsable_nombre,
      'DNI Responsable': r.responsable_dni || '',
      'Teléfono Responsable': r.responsable_telefono || '',
      'Correo Responsable': r.responsable_correo || '',
      'Líder de Sector': r.lider_nombre,
      'DNI Líder': r.lider_dni || '',
      'Teléfono Líder': r.lider_telefono || '',
      'Correo Líder': r.lider_correo || '',
      'Guía Oficial': r.guia_nombre,
      'DNI Guía': r.guia_dni || '',
      'Celular Guía': r.guia_telefono || '',
      'Correo Guía': r.guia_correo || '',
      'Carta Respaldo': r.guia_carta ? 'SÍ' : 'NO',
      'Cupo Voluntarios': r.total_voluntarios || 9
    }));

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Cadena_Mandos');
    xlsx.writeFile(wb, `Cadena_Mandos_Oficial_VisitaPapal_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleResp = (nombre) => {
    setExpandedResp(prev => ({ ...prev, [nombre]: !prev[nombre] }));
  };

  const toggleLider = (nombre) => {
    setExpandedLider(prev => ({ ...prev, [nombre]: !prev[nombre] }));
  };

  const expandAll = () => {
    const allR = {};
    const allL = {};
    treeData.forEach(r => {
      allR[r.nombre] = true;
      r.lideres.forEach(l => {
        allL[r.nombre + '_' + l.nombre] = true;
      });
    });
    setExpandedResp(allR);
    setExpandedLider(allL);
  };

  const collapseAll = () => {
    setExpandedResp({});
    setExpandedLider({});
  };

  return (
    <div className="space-y-6">
      
      {/* CABECERA Y METRICAS CLAVE */}
      <div className="bg-white rounded-3xl p-6 md:p-8 card-shadow border border-stone-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-diocesis-redDark to-diocesis-red flex items-center justify-center text-white shadow-md">
              <Shield className="w-6 h-6 text-diocesis-mustard" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-title font-extrabold text-stone-900">
                Estructura y Cadena de Mandos 2026
              </h2>
              <p className="text-xs md:text-sm text-stone-500">
                Directorio integral de Responsables Territoriales, Líderes de Sector y Guías de Cuadrilla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAbrirSincronizacion}
              disabled={syncLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-diocesis-redDark to-diocesis-red hover:from-diocesis-red hover:to-red-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition cursor-pointer disabled:opacity-50"
              title="Sincronizar y actualizar desde Google Sheets con reporte de cambios previo"
            >
              <CloudDownload className={`w-4 h-4 ${syncLoading ? 'animate-bounce' : ''}`} />
              <span>{syncLoading ? 'Leyendo Google Sheets...' : 'Sincronizar Google Sheets'}</span>
            </button>

            <button
              onClick={fetchEstructura}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-diocesis-red' : ''}`} />
              <span>Refrescar</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition cursor-pointer"
              title="Descargar toda la jerarquía en Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Jerarquía a Excel</span>
            </button>
          </div>
        </div>

        {/* TARJETAS DE MÉTRICAS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-6">
          
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Responsables</span>
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-amber-950">
              {stats.responsables}
            </div>
            <span className="text-[11px] text-amber-700 font-medium mt-1">Zonas territoriales</span>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-600 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Líderes de Sector</span>
              <UserCheck className="w-4 h-4 text-diocesis-red" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-stone-900">
              {stats.lideres}
            </div>
            <span className="text-[11px] text-stone-500 font-medium mt-1">Coordinadores de campo</span>
          </div>

          <div className="bg-diocesis-mustard/15 border border-diocesis-mustard/40 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-900 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Guías / Cuadrillas</span>
              <Users className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-stone-900">
              {stats.guias}
            </div>
            <span className="text-[11px] text-amber-800 font-medium mt-1">Líderes de cuadrilla</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Capacidad Total</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-950">
              {stats.cupos.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium mt-1">Cupos de voluntarios</span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Con WhatsApp</span>
              <Phone className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-blue-950">
              {stats.conTel} <span className="text-sm font-semibold text-blue-700">({stats.pctTel}%)</span>
            </div>
            <span className="text-[11px] text-blue-700 font-medium mt-1">Contacto directo listo</span>
          </div>

        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS, FILTROS Y VISTAS */}
      <div className="bg-white rounded-3xl p-5 card-shadow border border-stone-200 space-y-4">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Selector de Vista: Árbol vs Tabla */}
          <div className="inline-flex p-1 bg-stone-100 rounded-2xl border border-stone-200 self-start">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'tree'
                  ? 'bg-diocesis-redDark text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vista en Árbol Jerárquico</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-diocesis-redDark text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Vista en Tabla Maestra ({filteredRecords.length})</span>
            </button>
          </div>

          {/* Acciones de Árbol */}
          {viewMode === 'tree' && (
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={expandAll}
                className="px-2.5 py-1 text-stone-600 hover:text-stone-900 font-semibold hover:bg-stone-100 rounded-lg transition cursor-pointer"
              >
                Expandir Todo
              </button>
              <span className="text-stone-300">|</span>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1 text-stone-600 hover:text-stone-900 font-semibold hover:bg-stone-100 rounded-lg transition cursor-pointer"
              >
                Colapsar Todo
              </button>
            </div>
          )}

        </div>

        {/* FILTROS INTERACTIVOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          
          {/* Buscador de texto */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, DNI, cuadrilla..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Responsable */}
          <div>
            <select
              value={selectedResp}
              onChange={(e) => {
                setSelectedResp(e.target.value);
                setSelectedLider('ALL'); // Resetear líder al cambiar de responsable
              }}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
            >
              <option value="ALL">Todos los Responsables ({responsablesList.length})</option>
              {responsablesList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Líder */}
          <div>
            <select
              value={selectedLider}
              onChange={(e) => setSelectedLider(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
            >
              <option value="ALL">Todos los Líderes ({lideresList.length})</option>
              {lideresList.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Contacto / Carta */}
          <div>
            <select
              value={filterContacto}
              onChange={(e) => setFilterContacto(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-diocesis-red focus:bg-white transition"
            >
              <option value="ALL">Todo el personal</option>
              <option value="CON_TEL">Solo con Teléfono registrado</option>
              <option value="SIN_TEL">Sin Teléfono (Pendientes)</option>
              <option value="CON_CORREO">Solo con Correo</option>
              <option value="CON_CARTA">Solo con Carta de Respaldo</option>
            </select>
          </div>

        </div>

      </div>

      {/* CONTENIDO PRINCIPAL */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center card-shadow border border-stone-200">
          <RefreshCw className="w-8 h-8 text-diocesis-red animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-700">Cargando jerarquía territorial oficial...</p>
          <p className="text-xs text-stone-400 mt-1">Consultando base de datos en tiempo real</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center card-shadow border border-stone-200">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-base font-bold text-stone-800">No se encontraron cuadrillas ni mandos</p>
          <p className="text-xs text-stone-500 mt-1">Prueba ajustando los filtros o el término de búsqueda</p>
        </div>
      ) : viewMode === 'tree' ? (

        /* ================= VISTA EN ÁRBOL JERÁRQUICO ================= */
        <div className="space-y-4">
          {treeData.map((resp) => {
            const isRespOpen = !!expandedResp[resp.nombre];
            return (
              <div 
                key={resp.nombre}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden card-shadow transition-all"
              >
                {/* CABECERA DEL RESPONSABLE (NIVEL 1) */}
                <div
                  onClick={() => toggleResp(resp.nombre)}
                  className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition select-none ${
                    isRespOpen ? 'bg-amber-50/50 border-b border-amber-200/60' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 shrink-0"
                    >
                      {isRespOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    
                    <div className="w-10 h-10 rounded-xl bg-amber-600/15 text-amber-900 border border-amber-300 flex items-center justify-center font-black text-sm shrink-0">
                      RT
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                          Responsable Territorial
                        </span>
                        {resp.dni && (
                          <span className="text-[11px] font-mono text-stone-500">
                            DNI: {resp.dni}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base md:text-lg font-bold text-stone-900 mt-0.5">
                        {resp.nombre}
                      </h3>
                    </div>
                  </div>

                  {/* Resumen numérico y datos de contacto */}
                  <div className="flex items-center gap-3 pl-10 md:pl-0 flex-wrap">
                    {resp.telefono && (
                      <a
                        href={`https://wa.me/51${String(resp.telefono).replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
                        title="Contactar Responsable por WhatsApp"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{resp.telefono}</span>
                      </a>
                    )}

                    <div className="text-right">
                      <div className="text-xs font-bold text-stone-800">
                        {resp.lideres.length} Líderes • {resp.totalCuadrillas} Guías
                      </div>
                      <div className="text-[11px] text-stone-500 font-medium">
                        Capacidad: {resp.totalCapacidad} voluntarios
                      </div>
                    </div>
                  </div>
                </div>

                {/* CUERPO DEL RESPONSABLE: LISTA DE LÍDERES (NIVEL 2) */}
                {isRespOpen && (
                  <div className="p-4 md:p-6 space-y-4 bg-stone-50/40">
                    {resp.lideres.map((lider) => {
                      const liderKey = resp.nombre + '_' + lider.nombre;
                      const isLiderOpen = expandedLider[liderKey] !== false; // Abierto por defecto cuando el responsable está abierto

                      return (
                        <div
                          key={lider.nombre}
                          className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs"
                        >
                          {/* CABECERA DEL LÍDER */}
                          <div
                            onClick={() => toggleLider(liderKey)}
                            className={`p-3.5 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition select-none ${
                              isLiderOpen ? 'bg-stone-50/80 border-b border-stone-200' : 'hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center text-stone-500 shrink-0"
                              >
                                {isLiderOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>

                              <div className="w-8 h-8 rounded-lg bg-diocesis-red/10 text-diocesis-redDark border border-diocesis-red/20 flex items-center justify-center font-bold text-xs shrink-0">
                                LS
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-diocesis-red/10 text-diocesis-redDark">
                                    Líder de Sector
                                  </span>
                                  {lider.dni && (
                                    <span className="text-[11px] font-mono text-stone-500">
                                      DNI: {lider.dni}
                                    </span>
                                  )}
                                  {lider.carta && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                      Carta OK
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm md:text-base font-bold text-stone-900 mt-0.5">
                                  {lider.nombre}
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 pl-9 sm:pl-0 flex-wrap">
                              {lider.telefono && (
                                <a
                                  href={`https://wa.me/51${String(lider.telefono).replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                                  title="Contactar Líder por WhatsApp"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{lider.telefono}</span>
                                </a>
                              )}

                              <span className="text-xs font-bold text-stone-700 px-2 py-0.5 rounded-md bg-stone-100">
                                {lider.guias.length} Guías a cargo
                              </span>
                            </div>
                          </div>

                          {/* CUERPO DEL LÍDER: LISTA DE GUÍAS (NIVEL 3) */}
                          {isLiderOpen && (
                            <div className="p-3 md:p-4 bg-white">
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                {lider.guias.map((guia) => (
                                  <div
                                    key={guia.id || guia.cuadrilla_codigo}
                                    className="p-3 rounded-xl border border-stone-200 bg-stone-50/40 hover:bg-amber-50/30 hover:border-amber-300 transition flex flex-col justify-between space-y-2"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-diocesis-redDark text-white">
                                            {guia.cuadrilla_codigo}
                                          </span>
                                          {guia.guia_carta && (
                                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1 rounded">
                                              Carta SÍ
                                            </span>
                                          )}
                                        </div>
                                        <h5 className="text-xs font-bold text-stone-900 mt-1 leading-snug">
                                          {guia.guia_nombre}
                                        </h5>
                                        <p className="text-[11px] font-mono text-stone-500 mt-0.5">
                                          DNI: {guia.guia_dni || 'No reg.'}
                                        </p>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="text-[10px] font-bold text-stone-500 bg-stone-200/70 px-1.5 py-0.5 rounded">
                                          {guia.total_voluntarios || 9} cupos
                                        </span>
                                      </div>
                                    </div>

                                    {/* Canales de Contacto del Guía */}
                                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] gap-2">
                                      {guia.guia_telefono ? (
                                        <a
                                          href={`https://wa.me/51${String(guia.guia_telefono).replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition"
                                          title="WhatsApp del Guía"
                                        >
                                          <Phone className="w-3 h-3" />
                                          <span>{guia.guia_telefono}</span>
                                        </a>
                                      ) : (
                                        <span className="text-stone-400 italic text-[10px]">Sin teléfono</span>
                                      )}

                                      {guia.guia_correo ? (
                                        <a
                                          href={`mailto:${guia.guia_correo}`}
                                          className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 truncate max-w-[130px]"
                                          title={guia.guia_correo}
                                        >
                                          <Mail className="w-3 h-3 shrink-0 text-stone-400" />
                                          <span className="truncate">{guia.guia_correo}</span>
                                        </a>
                                      ) : (
                                        <span className="text-stone-300 text-[10px]">-</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      ) : (

        /* ================= VISTA EN TABLA MAESTRA ================= */
        <div className="bg-white rounded-3xl card-shadow border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Cuadrilla</th>
                  <th className="py-3 px-3">Responsable Territorial</th>
                  <th className="py-3 px-3">Líder de Sector</th>
                  <th className="py-3 px-3">Guía Oficial</th>
                  <th className="py-3 px-3">DNI Guía</th>
                  <th className="py-3 px-3">Celular Guía</th>
                  <th className="py-3 px-3">Correo Guía</th>
                  <th className="py-3 px-3 text-center">Carta</th>
                  <th className="py-3 px-3 text-right">Cupo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRecords.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-amber-50/40 transition">
                    <td className="py-3 px-3 font-bold text-stone-400">{i + 1}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-diocesis-redDark border border-stone-300">
                        {r.cuadrilla_codigo}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-stone-800">{r.responsable_nombre}</td>
                    <td className="py-3 px-3 text-stone-700 font-medium">{r.lider_nombre}</td>
                    <td className="py-3 px-3 font-extrabold text-stone-900">{r.guia_nombre}</td>
                    <td className="py-3 px-3 font-mono font-bold text-stone-700">{r.guia_dni || '-'}</td>
                    <td className="py-3 px-3">
                      {r.guia_telefono ? (
                        <a
                          href={`https://wa.me/51${String(r.guia_telefono).replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition"
                          title="Escribir por WhatsApp"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{r.guia_telefono}</span>
                        </a>
                      ) : (
                        <span className="text-stone-400 italic text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-stone-500 truncate max-w-[150px]" title={r.guia_correo}>
                      {r.guia_correo || '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {r.guia_carta ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          SÍ
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400">NO</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-800">
                      {r.total_voluntarios || 9}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {/* MODAL DE SINCRONIZACIÓN Y PREVISUALIZACIÓN DE CAMBIOS */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-diocesis-red/30 border border-diocesis-mustard/40 flex items-center justify-center text-diocesis-mustard">
                  <CloudDownload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-title">Sincronización Inteligente con Google Sheets</h3>
                  <p className="text-xs text-stone-300">
                    Previsualización del reporte de diferencias antes de actualizar la base de datos oficial
                  </p>
                </div>
              </div>
              <button
                onClick={() => !syncApplying && setSyncModalOpen(false)}
                disabled={syncApplying}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Tarjetas de Resumen Diff */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setDiffTab('agregados')}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    diffTab === 'agregados'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                      : 'bg-stone-50 border-stone-200 hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    <span>Nuevos</span>
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                    +{diffData?.summary?.agregados || 0}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium">Guías a insertar</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDiffTab('modificados')}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    diffTab === 'modificados'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                      : 'bg-stone-50 border-stone-200 hover:border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wide">
                    <span>Modificados</span>
                    <RefreshCcw className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-amber-700 mt-1">
                    ~{diffData?.summary?.modificados || 0}
                  </div>
                  <div className="text-[11px] text-amber-600 font-medium">Con cambios de datos</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDiffTab('eliminados')}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                    diffTab === 'eliminados'
                      ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300'
                      : 'bg-stone-50 border-stone-200 hover:border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-rose-800 uppercase tracking-wide">
                    <span>Eliminados</span>
                    <UserMinus className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-rose-700 mt-1">
                    -{diffData?.summary?.eliminados || 0}
                  </div>
                  <div className="text-[11px] text-rose-600 font-medium">Ya no figuran en Sheet</div>
                </button>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-left">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-600 uppercase tracking-wide">
                    <span>Sin Cambios</span>
                    <CheckCheck className="w-4 h-4 text-stone-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-stone-800 mt-1">
                    ={diffData?.summary?.sinCambios || 0}
                  </div>
                  <div className="text-[11px] text-stone-500 font-medium">Intactos (Total: {diffData?.totalExcel || 0})</div>
                </div>
              </div>

              {/* Banner informativo de seguridad */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Seguridad y Respaldo:</strong> Al confirmar, el sistema creará automáticamente una tabla de respaldo en la base de datos con la marca de tiempo actual antes de reemplazar la estructura. Además, los líderes asignados conservarán sus accesos al sistema.
                </p>
              </div>

              {/* Mensaje de éxito si ya se aplicó */}
              {syncSuccessMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center gap-3 animate-bounce">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">¡Sincronización Exitosa!</h4>
                    <p className="text-xs">{syncSuccessMessage}</p>
                  </div>
                </div>
              )}

              {/* Contenido según la pestaña seleccionada */}
              <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-3">
                  <h4 className="font-bold text-sm text-stone-800 flex items-center gap-2">
                    {diffTab === 'modificados' && <span>Detalle de Registros Modificados ({diffData?.modificados?.length || 0})</span>}
                    {diffTab === 'agregados' && <span>Detalle de Nuevos Guías / Cuadrillas ({diffData?.agregados?.length || 0})</span>}
                    {diffTab === 'eliminados' && <span>Detalle de Registros a Retirar ({diffData?.eliminados?.length || 0})</span>}
                  </h4>
                  <span className="text-[11px] text-stone-500 italic">
                    Mostrando diferencias directas DNI a DNI
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {diffTab === 'modificados' && (
                    !diffData?.modificados?.length ? (
                      <p className="text-xs text-stone-500 italic py-6 text-center">No hay registros con modificaciones de datos.</p>
                    ) : (
                      diffData.modificados.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white border border-amber-200 rounded-xl space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-bold text-xs text-stone-900">{item.guia_nombre}</span>
                            <span className="font-mono text-[11px] bg-stone-100 px-2 py-0.5 rounded text-stone-700">DNI: {item.guia_dni}</span>
                          </div>
                          <div className="text-[11px] text-stone-600">
                            <strong>Líder actual en Sheet:</strong> {item.lider_nombre}
                          </div>
                          <div className="mt-1 space-y-1 bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                            {item.cambios?.map((c, cIdx) => (
                              <div key={cIdx} className="text-[11px] font-mono text-amber-900 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                <span>{c}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )
                  )}

                  {diffTab === 'agregados' && (
                    !diffData?.agregados?.length ? (
                      <p className="text-xs text-stone-500 italic py-6 text-center">No se detectaron nuevos registros en el Google Sheet.</p>
                    ) : (
                      diffData.agregados.map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-white border border-emerald-200 rounded-xl flex items-center justify-between shadow-2xs text-xs">
                          <div>
                            <div className="font-bold text-stone-900">{item.guia_nombre}</div>
                            <div className="text-[11px] text-stone-500">
                              Líder: {item.lider_nombre} • Resp: {item.responsable_nombre}
                            </div>
                          </div>
                          <div className="text-right font-mono text-[11px]">
                            <span className="font-bold text-emerald-800">{item.cuadrilla_codigo}</span>
                            <div className="text-stone-500">DNI: {item.guia_dni}</div>
                          </div>
                        </div>
                      ))
                    )
                  )}

                  {diffTab === 'eliminados' && (
                    !diffData?.eliminados?.length ? (
                      <p className="text-xs text-stone-500 italic py-6 text-center">No se detectaron registros para eliminar.</p>
                    ) : (
                      diffData.eliminados.map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-white border border-rose-200 rounded-xl flex items-center justify-between shadow-2xs text-xs">
                          <div>
                            <div className="font-bold text-rose-900 line-through">{item.guia_nombre}</div>
                            <div className="text-[11px] text-stone-500">
                              Anterior Líder: {item.lider_nombre}
                            </div>
                          </div>
                          <div className="text-right font-mono text-[11px]">
                            <span className="font-bold text-stone-500">{item.cuadrilla_codigo}</span>
                            <div className="text-stone-500">DNI: {item.guia_dni}</div>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                disabled={syncApplying}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                Cerrar / Descartar
              </button>

              <button
                type="button"
                onClick={handleAplicarSincronizacion}
                disabled={syncApplying}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {syncApplying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Aplicando y Creando Respaldo...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar y Aplicar Sincronización Oficial</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
