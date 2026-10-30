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
  AlertCircle
} from 'lucide-react';
import * as xlsx from 'xlsx';

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
              <Users className="w-3.5 h-3.5" />
              <span>Vista en Tabla Maestra</span>
            </button>
          </div>

          {/* Controles de expandir/colapsar (solo para vista árbol) */}
          {viewMode === 'tree' && (
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Expandir Todo
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Colapsar Todo
              </button>
            </div>
          )}

          <div className="text-xs text-stone-500 font-bold self-end lg:self-center">
            Mostrando <span className="text-stone-900 font-extrabold">{filteredRecords.length}</span> de {records.length} cuadrillas
          </div>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
          
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Guía, Líder, DNI o CUA..."
              className="w-full pl-10 pr-8 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-diocesis-red outline-none"
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

          {/* Filtro Responsable */}
          <div>
            <select
              value={selectedResp}
              onChange={(e) => {
                setSelectedResp(e.target.value);
                setSelectedLider('ALL');
              }}
              className="w-full py-2 px-3 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 focus:ring-2 focus:ring-diocesis-red outline-none"
            >
              <option value="ALL">🏛️ Todos los Responsables ({responsablesList.length})</option>
              {responsablesList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Filtro Líder */}
          <div>
            <select
              value={selectedLider}
              onChange={(e) => setSelectedLider(e.target.value)}
              className="w-full py-2 px-3 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 focus:ring-2 focus:ring-diocesis-red outline-none"
            >
              <option value="ALL">👤 Todos los Líderes ({lideresList.length})</option>
              {lideresList.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Filtro de Contacto / Carta */}
          <div>
            <select
              value={filterContacto}
              onChange={(e) => setFilterContacto(e.target.value)}
              className="w-full py-2 px-3 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 focus:ring-2 focus:ring-diocesis-red outline-none"
            >
              <option value="ALL">⚙️ Todos los estados</option>
              <option value="CON_TEL">📱 Con Teléfono / WhatsApp</option>
              <option value="SIN_TEL">⚠️ Sin Teléfono registrado</option>
              <option value="CON_CORREO">✉️ Con Correo Electrónico</option>
              <option value="CON_CARTA">✓ Con Carta de Respaldo</option>
            </select>
          </div>

        </div>

      </div>

      {/* CONTENIDO PRINCIPAL: MODO ÁRBOL O MODO TABLA */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 text-center text-stone-500 border border-stone-200 card-shadow">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-diocesis-red mb-3" />
          <p className="font-bold text-sm">Cargando jerarquía oficial diocesana...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center text-stone-500 border border-stone-200 card-shadow">
          <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
          <p className="font-bold text-sm text-stone-700">No se encontraron cuadrillas con los filtros seleccionados.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedResp('ALL');
              setSelectedLider('ALL');
              setFilterContacto('ALL');
            }}
            className="mt-3 px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
          >
            Limpiar todos los filtros
          </button>
        </div>
      ) : viewMode === 'tree' ? (
        
        /* ================= VISTA EN ÁRBOL JERÁRQUICO ================= */
        <div className="space-y-4">
          {treeData.map((resp) => {
            const isRespOpen = Boolean(expandedResp[resp.nombre]);

            return (
              <div 
                key={resp.nombre}
                className="bg-white rounded-3xl card-shadow border border-stone-200 overflow-hidden transition-all"
              >
                {/* CABECERA DEL RESPONSABLE */}
                <div 
                  onClick={() => toggleResp(resp.nombre)}
                  className="p-5 md:p-6 bg-gradient-to-r from-stone-50 via-white to-amber-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-stone-100/60 transition border-b border-stone-100"
                >
                  <div className="flex items-center gap-3">
                    <button className="w-8 h-8 rounded-full bg-stone-200/80 text-stone-700 flex items-center justify-center shrink-0">
                      {isRespOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-diocesis-redDark text-white">
                          Responsable Territorial
                        </span>
                        {resp.carta && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            ✓ Carta
                          </span>
                        )}
                      </div>
                      <h3 className="text-base md:text-lg font-title font-bold text-stone-900 mt-1">
                        {resp.nombre}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-stone-500 font-mono mt-0.5 flex-wrap">
                        {resp.dni && <span>DNI: {resp.dni}</span>}
                        {resp.telefono && (
                          <a
                            href={`https://wa.me/51${String(resp.telefono).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{resp.telefono}</span>
                          </a>
                        )}
                        {resp.correo && (
                          <span className="text-stone-400 truncate max-w-[200px]" title={resp.correo}>
                            {resp.correo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges de Cuadrillas y Capacidad */}
                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                      👤 {resp.lideres.length} Líderes
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-stone-100 text-stone-800 text-xs font-bold border border-stone-200">
                      🚩 {resp.totalCuadrillas} Cuadrillas
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300">
                      👥 {resp.totalCapacidad} Cupos
                    </span>
                  </div>
                </div>

                {/* CUERPO DEL RESPONSABLE: LISTA DE LÍDERES */}
                {isRespOpen && (
                  <div className="p-4 md:p-6 space-y-4 bg-stone-50/40">
                    {resp.lideres.map((lider) => {
                      const liderKey = resp.nombre + '_' + lider.nombre;
                      const isLiderOpen = Boolean(expandedLider[liderKey]);

                      return (
                        <div 
                          key={lider.nombre}
                          className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden"
                        >
                          {/* CABECERA DEL LÍDER */}
                          <div
                            onClick={() => toggleLider(liderKey)}
                            className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-amber-50/30 transition border-b border-stone-100"
                          >
                            <div className="flex items-center gap-3">
                              <button className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
                                {isLiderOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                                    Líder de Sector
                                  </span>
                                  {lider.carta && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      ✓ Carta
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-stone-900 mt-0.5">
                                  {lider.nombre}
                                </h4>
                                <div className="flex items-center gap-2.5 text-[11px] text-stone-500 font-mono mt-0.5 flex-wrap">
                                  {lider.dni && <span>DNI: {lider.dni}</span>}
                                  {lider.telefono && (
                                    <a
                                      href={`https://wa.me/51${String(lider.telefono).replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold"
                                    >
                                      <Phone className="w-2.5 h-2.5" />
                                      <span>{lider.telefono}</span>
                                    </a>
                                  )}
                                  {lider.correo && (
                                    <span className="text-stone-400 truncate max-w-[180px]" title={lider.correo}>
                                      {lider.correo}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                                {lider.guias.length} Guías asignados
                              </span>
                            </div>
                          </div>

                          {/* CUERPO DEL LÍDER: LISTA DE GUÍAS / CUADRILLAS */}
                          {isLiderOpen && (
                            <div className="p-3 sm:p-4 bg-stone-50/60">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {lider.guias.map((g) => (
                                  <div
                                    key={g.id || g.cuadrilla_codigo}
                                    className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs hover:border-diocesis-mustard transition flex flex-col justify-between"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="font-mono text-[11px] font-black px-1.5 py-0.5 rounded bg-diocesis-redDark text-white">
                                          {g.cuadrilla_codigo}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          {g.guia_carta ? (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                              ✓ Carta
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                                              Sin carta
                                            </span>
                                          )}
                                          <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                                            {g.total_voluntarios || 9} cupos
                                          </span>
                                        </div>
                                      </div>

                                      <h5 className="font-bold text-xs text-stone-900 leading-tight">
                                        {g.guia_nombre}
                                      </h5>
                                      <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                                        DNI: {g.guia_dni || 'Sin DNI'}
                                      </div>
                                    </div>

                                    {/* Canales de contacto directo */}
                                    <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                                      {g.guia_telefono ? (
                                        <a
                                          href={`https://wa.me/51${String(g.guia_telefono).replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition"
                                          title="Escribir por WhatsApp"
                                        >
                                          <Phone className="w-2.5 h-2.5" />
                                          <span>{g.guia_telefono}</span>
                                        </a>
                                      ) : (
                                        <span className="text-stone-400 italic text-[10px]">Sin teléfono</span>
                                      )}

                                      {g.guia_correo && (
                                        <a
                                          href={`mailto:${g.guia_correo}`}
                                          className="text-stone-400 hover:text-stone-700 p-1"
                                          title={g.guia_correo}
                                        >
                                          <Mail className="w-3.5 h-3.5" />
                                        </a>
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

    </div>
  );
}
