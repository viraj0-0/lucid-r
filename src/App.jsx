import COLLEGE_DATA from "./college_data.json";
import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Percent, BookOpen, AlertCircle, CheckCircle, BarChart3, Layers, GraduationCap, Building2, ChevronRight, Trophy, Cpu, ArrowUp, Heart, Scale, ArrowUpDown, X, Split, Download } from 'lucide-react';



// --- CONSTANTS ---
const REGIONS = ["All", "Amravati", "Aurangabad", "Mumbai", "Nagpur", "Nashik", "Pune", "Other"];
const CATEGORIES = ["GOPEN", "GSC", "GST", "GVJ", "GNTB", "GNTC", "GNTD", "GOBC", "GSEBC", "LOPEN", "LSC", "LST", "LOBC", "LSEBC", "EWS"];
const CAP_ROUNDS = ["CAP1", "CAP2"];

const BRANCH_GROUPS = {
  "All Branches": null,
  "Computer & IT": /computer|information technology|cyber|data|artificial|machine learning|software|iot|blockchain/i,
  "Civil & Construction": /civil|construction|structure|environment/i,
  "Mechanical & Auto": /mechanical|automobile|production|robotics|mechatronics|industrial/i,
  "Electrical": /electrical/i,
  "E&TC / Electronics": /electronics|telecommunication|communication|e&tc/i,
  "Chemical & Petro": /chemical|petro|polymer|plastic|oil|paint/i,
  "Instrumentation": /instrumentation|control/i,
  "Textile": /textile|fashion/i
};

const App = () => {
  const [filters, setFilters] = useState({
    searchQuery: "",
    region: "All",
    category: "GOPEN",
    percentage: "",
    capRound: "CAP1",
    branchGroup: "All Branches"
  });

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [shortlist, setShortlist] = useState([]);
  const [compareList, setCompareList] = useState([]);
  const [showShortlistOnly, setShowShortlistOnly] = useState(false);
  const [sortBy, setSortBy] = useState("relevance"); 
  const [showCompareModal, setShowCompareModal] = useState(false);

  // --- PERSISTENCE: LOAD & SAVE ---
  useEffect(() => {
    try {
      const savedShortlist = JSON.parse(localStorage.getItem("shortlist"));
      if (savedShortlist) setShortlist(savedShortlist);
      const savedCompareList = JSON.parse(localStorage.getItem("compareList"));
      if (savedCompareList) setCompareList(savedCompareList);
    } catch (e) {
      console.error("Failed to load saved data", e);
    }
  }, []);

  useEffect(() => { localStorage.setItem("shortlist", JSON.stringify(shortlist)); }, [shortlist]);
  useEffect(() => { localStorage.setItem("compareList", JSON.stringify(compareList)); }, [compareList]);

  // --- SCROLL TO TOP LOGIC ---
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const getCollegeRegion = (college) => {
    if (college.region) return college.region;
    const idStr = String(college.id);
    if (idStr.length === 4) {
      switch (idStr.charAt(0)) {
        case '1': return "Amravati"; case '2': return "Aurangabad"; case '3': return "Mumbai";
        case '4': return "Nagpur"; case '5': return "Nashik"; case '6': return "Pune";
        default: return "Other";
      }
    }
    return "Other";
  };

  // --- OPTIMIZED FILTER & SORT LOGIC ---
  const filteredData = useMemo(() => {
    let data = COLLEGE_DATA;

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(c => c.name.toLowerCase().includes(query) || String(c.id).includes(query));
    }

    if (showShortlistOnly) data = data.filter(c => shortlist.includes(c.id));
    if (filters.region !== "All") data = data.filter(c => getCollegeRegion(c) === filters.region);

    data = data.map(college => {
      const eligibleBranches = college.branches.filter(branch => {
        let matchesGroup = true;
        if (filters.branchGroup !== "All Branches") {
          const regex = BRANCH_GROUPS[filters.branchGroup];
          if (regex) matchesGroup = regex.test(branch.name);
        }
        if (!matchesGroup) return false;

        if (filters.percentage) {
          const userPercent = parseFloat(filters.percentage);
          if (isNaN(userPercent)) return true;
          const roundCutoffs = branch.cutoffs?.[filters.capRound];
          if (!roundCutoffs) return false;
          const cutoff = roundCutoffs[filters.category];
          return cutoff !== undefined && userPercent >= cutoff;
        }
        return true;
      });
      return { ...college, branches: eligibleBranches };
    }).filter(college => college.branches.length > 0);

    if (sortBy !== 'relevance') {
      data.sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        
        const getBestCutoff = (college) => {
          const validCutoffs = college.branches
            .map(b => b.cutoffs?.[filters.capRound]?.[filters.category])
            .filter(c => c !== undefined && c !== null);
          return validCutoffs.length > 0 ? Math.max(...validCutoffs) : -1;
        };

        const scoreA = getBestCutoff(a);
        const scoreB = getBestCutoff(b);

        if (sortBy === 'cutoff_high') return scoreB - scoreA;
        if (sortBy === 'cutoff_low') {
           if (scoreA === -1) return 1;
           if (scoreB === -1) return -1;
           return scoreA - scoreB;
        }
        return 0;
      });
    }

    return data;
  }, [filters, shortlist, showShortlistOnly, sortBy]); 

  const handleInputChange = (e) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleShortlist = (id, e) => {
    e.stopPropagation();
    setShortlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleCompare = (id, e) => {
    e.stopPropagation();
    setCompareList(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id]; 
      return [...prev, id];
    });
  };

  // --- EXPORT FUNCTION ---
  const downloadComparison = () => {
    const collegesToCompare = compareList.map(id => COLLEGE_DATA.find(c => c.id === id)).filter(Boolean);
    if (collegesToCompare.length === 0) return;

    const allBranchNames = Array.from(new Set(collegesToCompare.flatMap(c => c.branches.map(b => b.name)))).sort();
    const htmlContent = `
      <!DOCTYPE html><html><head><title>Nexus Comparison</title>
      <style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse} th,td{padding:10px;border:1px solid #ccc;text-align:left}</style>
      </head><body><h2>Admission Comparison</h2>
      <table><thead><tr><th>Branch</th>${collegesToCompare.map(c => `<th>${c.name}</th>`).join('')}</tr></thead>
      <tbody>${allBranchNames.map(bName => `<tr><td>${bName}</td>${collegesToCompare.map(c => {
        const cutoff = c.branches.find(b => b.name === bName)?.cutoffs?.[filters.capRound]?.[filters.category];
        return `<td>${cutoff ? cutoff + '%' : 'N/A'}</td>`;
      }).join('')}</tr>`).join('')}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `comparison.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const getChanceLevel = (userPercent, cutoff) => {
    if (!userPercent || !cutoff) return "neutral";
    const diff = userPercent - cutoff;
    if (diff >= 5) return "high"; 
    if (diff >= 1) return "moderate"; 
    return "low"; 
  };

  const getChanceStyles = (level) => {
    switch (level) {
      case "high": return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", icon: <Trophy className="w-3 h-3" /> };
      case "moderate": return { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", icon: <CheckCircle className="w-3 h-3" /> };
      case "low": return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", icon: <AlertCircle className="w-3 h-3" /> };
      default: return { bg: "bg-[#222]", text: "text-gray-400", border: "border-[#333]", icon: null };
    }
  };

  return (
    <div className="min-h-screen font-sans bg-[#111] text-gray-200 selection:bg-cyan-500/30 selection:text-cyan-100">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 md:top-4 md:mx-auto max-w-7xl z-40 bg-[#1a1a1a] md:rounded-2xl border-b md:border border-[#333] shadow-md px-4 py-3 md:px-6 md:py-4 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#222] to-[#111] border border-[#333] p-2 md:p-2.5 rounded-xl shadow-inner">
            <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-white tracking-tight leading-tight">
              Viraj - Naam toh suna he hoga😝
            </h1>
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-cyan-500 font-semibold">
              College decide karlo🫦
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowShortlistOnly(!showShortlistOnly)}
          className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border transition-colors ${showShortlistOnly ? 'bg-pink-500/10 border-pink-500/30 text-pink-400' : 'bg-[#222] border-[#333] text-gray-400 hover:text-white hover:border-[#444]'}`}
        >
          <Heart className={`w-4 h-4 md:w-4 md:h-4 ${showShortlistOnly ? 'fill-pink-400' : ''}`} />
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide">Saved ({shortlist.length})</span>
        </button>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        
        {/* --- CONTROL PANEL --- */}
        <div className="bg-[#1a1a1a] rounded-2xl md:rounded-3xl p-4 md:p-6 border border-[#333] mb-8 shadow-sm">
          
          {/* SMART SEARCH */}
          <div className="mb-6">
            <div className="flex items-center bg-[#222] rounded-xl border border-[#333] focus-within:border-cyan-500/70 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all">
               <div className="pl-4 pr-2 text-gray-500">
                  <Search className="w-5 h-5 md:w-6 md:h-6" />
               </div>
               <input
                  type="text"
                  name="searchQuery"
                  placeholder="Search Institute Name, ID, or City..."
                  value={filters.searchQuery}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 px-2 py-3.5 md:py-4 text-sm md:text-base outline-none"
                  autoComplete="off"
               />
               {filters.searchQuery && (
                 <button onClick={() => setFilters(prev => ({...prev, searchQuery: ""}))} className="mr-3 p-1.5 rounded-full hover:bg-[#333] text-gray-400 hover:text-white transition-colors">
                   <X className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>

          {/* FILTER GRID (Responsive) */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
            {[
              { label: "Cap Round", icon: Layers, name: "capRound", options: CAP_ROUNDS, colSpan: "lg:col-span-1" },
              { label: "Region", icon: MapPin, name: "region", options: REGIONS, colSpan: "lg:col-span-1" },
              { label: "Branch Type", icon: BookOpen, name: "branchGroup", options: Object.keys(BRANCH_GROUPS), colSpan: "col-span-2 lg:col-span-2" },
              { label: "Category", icon: Cpu, name: "category", options: CATEGORIES, colSpan: "lg:col-span-1" },
              { label: "Percentage", icon: Percent, name: "percentage", type: "number", placeholder: "00.00", colSpan: "lg:col-span-1" },
            ].map((field) => (
              <div key={field.name} className={`relative pt-2 ${field.colSpan}`}>
                <label className="absolute top-0 left-3 bg-[#1a1a1a] px-1 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider z-10 rounded">
                  {field.label}
                </label>
                <div className="relative">
                  <field.icon className="absolute left-3 top-3 w-4 h-4 text-gray-500 z-10 pointer-events-none" />
                  {field.type === 'number' ? (
                    <input
                      type="number" name={field.name} placeholder={field.placeholder}
                      value={filters[field.name]} onChange={handleInputChange}
                      className="w-full bg-[#222] border border-[#333] text-white pl-9 pr-3 py-2.5 rounded-xl focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 outline-none text-sm font-mono transition-colors"
                    />
                  ) : (
                    <select
                      name={field.name} value={filters[field.name]} onChange={handleInputChange}
                      className="w-full bg-[#222] border border-[#333] text-gray-200 pl-9 pr-8 py-2.5 rounded-xl focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 outline-none appearance-none transition-colors text-sm"
                    >
                      {field.options.map(opt => (
                        <option key={opt} value={opt} className="bg-[#222] text-white">
                          {field.name === 'capRound' && opt === 'CAP1' ? 'Round 1' : field.name === 'capRound' && opt === 'CAP2' ? 'Round 2' : opt}
                        </option>
                      ))}
                    </select>
                  )}
                  {field.type !== 'number' && <ChevronRight className="absolute right-3 top-3 w-4 h-4 text-gray-500 rotate-90 pointer-events-none" />}
                </div>
              </div>
            ))}
          </div>

          {/* SORT ROW */}
          <div className="mt-4 pt-4 border-t border-[#333] flex justify-end">
             <div className="relative w-full md:w-64">
                <ArrowUpDown className="absolute left-3 top-3 w-4 h-4 text-gray-500 z-10 pointer-events-none" />
                <select
                  value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-[#222] border border-[#333] text-gray-200 pl-9 pr-8 py-2.5 rounded-xl focus:border-cyan-500/70 outline-none appearance-none transition-colors text-sm"
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="cutoff_high">Cutoff (High to Low)</option>
                  <option value="cutoff_low">Cutoff (Low to High)</option>
                  <option value="name">Name (A-Z)</option>
                </select>
                <ChevronRight className="absolute right-3 top-3 w-4 h-4 text-gray-500 rotate-90 pointer-events-none" />
              </div>
          </div>
        </div>

        {/* --- RESULTS INFO --- */}
        <div className="flex items-end justify-between mb-4 px-1">
           <div className="flex items-baseline gap-2">
             <span className="text-3xl md:text-4xl font-bold text-white font-mono tracking-tighter">
               {filteredData.length}
             </span>
             <span className="text-xs md:text-sm text-gray-400 uppercase tracking-widest font-semibold">
               Institutes
             </span>
           </div>
           
           {/* COMPARE FLOAT BTN */}
           {compareList.length > 0 && (
              <button 
                onClick={() => setShowCompareModal(true)}
                className="fixed bottom-20 md:bottom-24 right-4 md:right-6 z-40 flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-full shadow-lg border border-indigo-500 hover:bg-indigo-500 transition-colors animate-bounce"
                style={{ animationIterationCount: 2 }}
              >
                <Split className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm font-bold">Compare ({compareList.length}/2)</span>
              </button>
           )}
        </div>

        {/* --- COLLEGE LIST --- */}
        <div className="space-y-4 md:space-y-6">
          {filteredData.length > 0 ? (
            filteredData.map((college) => (
              <div key={college.id} className="bg-[#1a1a1a] rounded-2xl border border-[#333] overflow-hidden hover:border-[#444] transition-colors shadow-sm">
                
                {/* Card Header */}
                <div className="p-4 md:p-6 border-b border-[#2a2a2a] bg-[#1d1d1d]">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex gap-4 items-start">
                      <div className="hidden md:flex shrink-0 h-14 w-14 rounded-2xl bg-[#222] items-center justify-center border border-[#333]">
                        <Building2 className="w-6 h-6 text-gray-500" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                           <span className="text-[10px] font-mono font-bold text-gray-400 bg-[#222] px-2 py-0.5 rounded border border-[#333]">
                             #{college.id}
                           </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {getCollegeRegion(college)}
                          </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-white leading-snug">
                          {college.name}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-start">
                      <button 
                        onClick={(e) => toggleCompare(college.id, e)}
                        className={`p-2 rounded-lg border transition-colors ${compareList.includes(college.id) ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-[#222] border-[#333] text-gray-400 hover:bg-[#2a2a2a] hover:text-white'}`}
                      >
                        <Split className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      <button 
                        onClick={(e) => toggleShortlist(college.id, e)}
                        className={`p-2 rounded-lg border transition-colors ${shortlist.includes(college.id) ? 'bg-pink-500/10 border-pink-500/30 text-pink-400' : 'bg-[#222] border-[#333] text-gray-400 hover:bg-[#2a2a2a] hover:text-white'}`}
                      >
                        <Heart className={`w-4 h-4 md:w-5 md:h-5 ${shortlist.includes(college.id) ? 'fill-pink-400' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Branches List */}
                <div className="bg-[#151515]">
                  {college.branches.map((branch) => {
                    const roundCutoffs = branch.cutoffs?.[filters.capRound];
                    const cutoff = roundCutoffs ? roundCutoffs[filters.category] : null;
                    const userPercent = parseFloat(filters.percentage);
                    const chance = getChanceLevel(userPercent, cutoff);
                    const styles = getChanceStyles(chance);
                    
                    return (
                      <div key={branch.code} className="p-4 md:px-6 border-b border-[#222] last:border-0 hover:bg-[#1a1a1a] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="text-gray-200 font-medium text-sm md:text-base leading-snug mb-1">
                            {branch.name}
                          </h4>
                          <span className="text-[11px] text-gray-500 font-mono tracking-tight">
                            CODE: {branch.code}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-1 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#222]">
                          {cutoff ? (
                            <div className="text-left md:text-right">
                              <div className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">
                                {filters.category} CUTOFF
                              </div>
                              <div className="text-base md:text-lg font-bold font-mono text-cyan-400">
                                {cutoff.toFixed(2)}<span className="text-xs text-cyan-600 ml-0.5">%</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-left md:text-right opacity-50">
                              <div className="text-[10px] uppercase tracking-widest text-gray-500">No Data</div>
                            </div>
                          )}

                          {filters.percentage && cutoff ? (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${styles.bg} ${styles.border} ${styles.text}`}>
                              {styles.icon}
                              <span className="text-[10px] font-bold uppercase tracking-widest">
                                {chance === 'high' ? 'Safe' : chance === 'moderate' ? 'Likely' : 'Risky'}
                              </span>
                            </div>
                          ) : (
                             <div className="hidden md:flex w-8 h-8 rounded-full items-center justify-center bg-[#222] border border-[#333] text-gray-500">
                                <ChevronRight className="w-4 h-4" />
                             </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 md:py-32 rounded-2xl border border-dashed border-[#333] bg-[#1a1a1a]">
              <div className="p-4 md:p-6 bg-[#222] rounded-full mb-4 md:mb-6 border border-[#333]">
                <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-gray-500" />
              </div>
              <h3 className="text-lg md:text-xl font-medium text-gray-200">No Institutes Found</h3>
              <p className="text-gray-500 mt-2 text-center text-sm px-4">
                {showShortlistOnly ? "Your saved list is empty." : "Try adjusting your filters or search query."}
              </p>
              <button 
                onClick={() => { setFilters({ ...filters, searchQuery: "", region: "All", percentage: "", branchGroup: "All Branches" }); setShowShortlistOnly(false); }}
                className="mt-6 px-6 py-2.5 rounded-xl bg-[#222] text-gray-300 border border-[#333] hover:bg-[#2a2a2a] transition-colors text-xs font-bold uppercase tracking-widest"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* --- SCROLL TO TOP --- */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 left-4 md:left-6 z-40 p-3 rounded-full bg-[#222] border border-[#333] text-cyan-400 shadow-lg transition-all duration-300 hover:bg-[#333] ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      {/* --- COMPARE MODAL --- */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm transition-all">
          <div className="relative w-full h-full md:h-[85vh] max-w-5xl bg-[#111] md:rounded-2xl border-0 md:border border-[#333] flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-[#333] bg-[#1a1a1a] flex items-center justify-between shrink-0">
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 md:gap-3">
                <Scale className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                Compare Institutes
              </h2>
              <div className="flex items-center gap-2 md:gap-3">
                <button onClick={downloadComparison} className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-[#222] text-gray-300 border border-[#333] hover:bg-[#2a2a2a] transition-colors text-[10px] md:text-xs font-bold uppercase">
                  <Download className="w-3 h-3 md:w-4 md:h-4" /> Export
                </button>
                <button onClick={() => setShowCompareModal(false)} className="p-1.5 md:p-2 bg-[#222] rounded-lg border border-[#333] text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Comparison Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6 bg-[#111]">
              {compareList.map(id => {
                const college = COLLEGE_DATA.find(c => c.id === id);
                return college ? (
                  <div key={id} className="bg-[#1a1a1a] p-4 md:p-6 rounded-xl border border-[#333] flex flex-col gap-4 md:gap-6">
                    <div>
                      <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded mb-2 inline-block border border-indigo-500/20">#{college.id}</span>
                      <h3 className="text-base md:text-xl font-bold text-white leading-tight">{college.name}</h3>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] md:text-xs border border-[#333] px-2 py-0.5 rounded text-gray-400 bg-[#222]">{college.region}</span>
                        <span className="text-[10px] md:text-xs border border-[#333] px-2 py-0.5 rounded text-gray-400 bg-[#222]">{college.type}</span>
                      </div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                      <h4 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500 border-b border-[#333] pb-2 flex justify-between">
                        <span>{filters.capRound} Cutoffs</span>
                        <span className="text-cyan-400">{filters.category}</span>
                      </h4>
                      {college.branches.map(branch => {
                        const cutoff = branch.cutoffs?.[filters.capRound]?.[filters.category];
                        return (
                          <div key={branch.code} className="flex justify-between items-start text-xs md:text-sm border-b border-[#222] pb-2 last:border-0 last:pb-0">
                            <span className="text-gray-300 w-2/3 pr-2">{branch.name}</span>
                            <span className={`font-mono font-bold ${cutoff ? 'text-cyan-400' : 'text-gray-600'}`}>
                              {cutoff ? `${cutoff}%` : 'N/A'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null;
              })}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default App;