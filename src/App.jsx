import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Percent, BookOpen, AlertCircle, CheckCircle, BarChart3, Filter, Layers, GraduationCap, Building2, ChevronRight, Zap, Trophy, Cpu, ArrowUp, Heart, Scale, ArrowUpDown, X, Split, Download } from 'lucide-react';
import COLLEGE_DATA from "./college_data.json";

// Make sure to import your Grainient component here
import Grainient from './Grainient';

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
  
  // --- STATE WITH PERSISTENCE LOGIC ---
  const [shortlist, setShortlist] = useState([]);
  const [compareList, setCompareList] = useState([]);
  
  // Feature States
  const [showShortlistOnly, setShowShortlistOnly] = useState(false);
  const [sortBy, setSortBy] = useState("relevance"); 
  const [showCompareModal, setShowCompareModal] = useState(false);

  // --- PERSISTENCE: LOAD DATA ---
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

  // --- PERSISTENCE: SAVE DATA ---
  useEffect(() => {
    localStorage.setItem("shortlist", JSON.stringify(shortlist));
  }, [shortlist]);

  useEffect(() => {
    localStorage.setItem("compareList", JSON.stringify(compareList));
  }, [compareList]);


  // --- SCROLL TO TOP LOGIC ---
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCollegeRegion = (college) => {
    if (college.region) return college.region;
    const idStr = String(college.id);
    if (idStr.length === 4) {
      const firstDigit = idStr.charAt(0);
      switch (firstDigit) {
        case '1': return "Amravati";
        case '2': return "Aurangabad";
        case '3': return "Mumbai";
        case '4': return "Nagpur";
        case '5': return "Nashik";
        case '6': return "Pune";
      }
    }
    return "Other";
  };

  // --- OPTIMIZED FILTER & SORT LOGIC (useMemo) ---
  const filteredData = useMemo(() => {
    let data = COLLEGE_DATA;

    // 0. Smart Text Search
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(college => 
        college.name.toLowerCase().includes(query) || 
        String(college.id).includes(query)
      );
    }

    // 0.5 Shortlist Filter
    if (showShortlistOnly) {
      data = data.filter(college => shortlist.includes(college.id));
    }

    // 1. Region Filter
    if (filters.region !== "All") {
      data = data.filter(college => getCollegeRegion(college) === filters.region);
    }

    // 2. Branch & Cutoff Logic
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

    // 3. Sorting Logic
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // --- FEATURE HANDLERS ---
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

  // --- PDF EXPORT LOGIC ---
  const downloadComparison = () => {
    const collegesToCompare = compareList.map(id => COLLEGE_DATA.find(c => c.id === id)).filter(Boolean);
    if (collegesToCompare.length === 0) return;

    const allBranchNames = Array.from(new Set(
      collegesToCompare.flatMap(c => c.branches.map(b => b.name))
    )).sort();

    const date = new Date().toLocaleString();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nexus Comparison Report</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: #fff; }
          .header { margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
          .meta { font-size: 12px; color: #64748b; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; table-layout: fixed; }
          th { text-align: left; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; vertical-align: bottom; }
          th.label-col { width: 25%; background: #fff; border: none; border-bottom: 1px solid #e2e8f0; }
          td { padding: 12px; border: 1px solid #e2e8f0; vertical-align: top; }
          .branch-row td { font-family: 'JetBrains Mono', monospace; }
          .section-header { background: #f1f5f9; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Nexus Admission Comparison</h1>
          <div class="meta">Generated: ${date} • Category: ${filters.category} • Round: ${filters.capRound}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="label-col"></th>
              ${collegesToCompare.map(c => `
                <th>
                  <div style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">${c.name}</div>
                  <div style="font-weight: 400; font-size: 11px; color: #64748b; text-transform: uppercase;">${c.region} • ${c.type}</div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="section-header" colspan="${collegesToCompare.length + 1}">Branch Cutoffs (${filters.category} %)</td>
            </tr>
            ${allBranchNames.map(branchName => {
              const cells = collegesToCompare.map(college => {
                const branch = college.branches.find(b => b.name === branchName);
                const cutoff = branch?.cutoffs?.[filters.capRound]?.[filters.category];
                return `<td style="color: ${cutoff ? '#0f172a' : '#cbd5e1'}">${cutoff ? cutoff.toFixed(2) + '%' : 'N/A'}</td>`;
              }).join('');
              return `
                <tr class="branch-row">
                  <td style="font-weight: 600; font-size: 13px; font-family: 'Inter', sans-serif;">${branchName}</td>
                  ${cells}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <script>
          window.onload = () => { setTimeout(() => window.print(), 500); }
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexus-comparison-${new Date().toISOString().slice(0,10)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
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
      case "high": return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-300",
        border: "border-emerald-500/40",
        glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)]",
        icon: <Trophy className="w-3 h-3" />
      };
      case "moderate": return {
        bg: "bg-yellow-500/10",
        text: "text-yellow-300",
        border: "border-yellow-500/40",
        glow: "shadow-[0_0_15px_rgba(234,179,8,0.2)]",
        icon: <CheckCircle className="w-3 h-3" />
      };
      case "low": return {
        bg: "bg-red-500/10",
        text: "text-red-300",
        border: "border-red-500/40",
        glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]",
        icon: <AlertCircle className="w-3 h-3" />
      };
      default: return {
        bg: "bg-slate-700/50",
        text: "text-slate-400",
        border: "border-slate-600",
        glow: "",
        icon: null
      };
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-100 relative overflow-hidden bg-slate-950 text-slate-100">
      
      {/* --- AMBIENT BACKGROUND REPLACED --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
{/* --- AMBIENT BACKGROUND --- */}
<div className="fixed inset-0 z-0 pointer-events-none">
  <Grainient
    color1="#1e293b"
    color2="#0891b2"
    color3="#4f46e5"
    timeSpeed={0.2}
    colorBalance={0.2}
    warpStrength={1}
    warpFrequency={5}
    warpSpeed={2}
    warpAmplitude={50}
    blendAngle={0}
    blendSoftness={0.1}
    rotationAmount={500}
    noiseScale={2}
    grainAmount={0.05}
    grainScale={2}
    grainAnimated={false}
    contrast={1.2}
    gamma={1}
    saturation={1}
    centerX={0}
    centerY={0}
    zoom={0.9}
  />
</div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* --- HEADER --- */}
        <header className="sticky top-4 mx-4 md:mx-auto max-w-7xl z-50">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl shadow-black/20 rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 ring-1 ring-white/5">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div className="relative bg-slate-900/50 border border-white/10 p-2.5 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-cyan-300" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-slate-400 tracking-tight">
                  Lucid Admission
                </h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/80 font-semibold mt-0.5">
                  Live Search 2025
                </p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
               {/* Global Stats / Shortlist Toggle */}
               <button 
                onClick={() => setShowShortlistOnly(!showShortlistOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${showShortlistOnly ? 'bg-pink-500/20 border-pink-500/50 text-pink-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
               >
                 <Heart className={`w-4 h-4 ${showShortlistOnly ? 'fill-pink-500' : ''}`} />
                 <span className="text-xs font-bold uppercase tracking-wide">Saved ({shortlist.length})</span>
               </button>
            </div>
          </div>
        </header>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
          
          {/* --- CONTROL PANEL --- */}
          <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-1 border border-white/5 shadow-2xl mb-8">
            <div className="bg-white/5 rounded-[20px] p-6 border border-white/5">
              
              {/* SMART SEARCH */}
              <div className="mb-8 relative group z-20">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-md"></div>
                <div className="relative flex items-center bg-slate-950/80 backdrop-blur-xl rounded-xl border border-white/10 focus-within:border-cyan-500/50 focus-within:bg-slate-900 transition-all duration-300">
                   <div className="pl-4 pr-3 text-slate-400 group-focus-within:text-cyan-400 transition-colors">
                      <Search className="w-6 h-6" />
                   </div>
                   <input
                      type="text"
                      name="searchQuery"
                      placeholder="Search by Institute Name, ID Code, or City..."
                      value={filters.searchQuery}
                      onChange={handleInputChange}
                      className="w-full bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 px-2 py-4 text-base md:text-lg"
                      autoComplete="off"
                   />
                   {filters.searchQuery && (
                     <button 
                       onClick={() => setFilters(prev => ({...prev, searchQuery: ""}))}
                       className="mr-4 p-1 rounded-full hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                     >
                       <span className="text-xs font-bold uppercase">Clear</span>
                     </button>
                   )}
                </div>
              </div>

              {/* FILTER ROW */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Cap Round", icon: Layers, name: "capRound", options: CAP_ROUNDS },
                    { label: "Region", icon: MapPin, name: "region", options: REGIONS },
                    { label: "Branch Type", icon: BookOpen, name: "branchGroup", options: Object.keys(BRANCH_GROUPS) },
                    { label: "Category", icon: Cpu, name: "category", options: CATEGORIES },
                  ].map((field) => (
                    <div key={field.name} className="group relative">
                      <label className="absolute -top-2.5 left-3 bg-slate-900 px-2 text-[10px] font-bold text-cyan-500 uppercase tracking-wider z-10 rounded border border-white/10">
                        {field.label}
                      </label>
                      <div className="relative">
                        <field.icon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 z-10" />
                        <select
                          name={field.name}
                          value={filters[field.name]}
                          onChange={handleInputChange}
                          className="w-full bg-slate-900/60 backdrop-blur-sm border border-white/10 text-slate-200 pl-10 pr-10 py-3 rounded-xl focus:ring-1 focus:ring-cyan-500/50 outline-none appearance-none transition-all text-sm"
                        >
                          {field.options.map(opt => (
                            <option key={opt} value={opt} className="bg-slate-900 text-slate-300">
                              {field.name === 'capRound' && opt === 'CAP1' ? 'Round 1' : 
                              field.name === 'capRound' && opt === 'CAP2' ? 'Round 2' : opt}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-600 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-px w-full lg:w-px lg:h-12 bg-white/10"></div>

                <div className="flex flex-col sm:flex-row gap-4 lg:w-1/3">
                  {/* Percentage */}
                  <div className="group relative flex-1">
                    <label className="absolute -top-2.5 left-3 bg-slate-900 px-2 text-[10px] font-bold text-purple-400 uppercase tracking-wider z-10 rounded border border-white/10">
                      Percentage
                    </label>
                    <div className="relative">
                      <Percent className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400 z-10" />
                      <input
                        type="number"
                        name="percentage"
                        placeholder="00.00"
                        value={filters.percentage}
                        onChange={handleInputChange}
                        className="w-full bg-slate-900/60 backdrop-blur-sm border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-1 focus:ring-purple-500/50 outline-none text-sm font-mono"
                      />
                    </div>
                  </div>

                   {/* SORT CONTROL */}
                   <div className="group relative flex-1">
                    <label className="absolute -top-2.5 left-3 bg-slate-900 px-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider z-10 rounded border border-white/10">
                      Sort By
                    </label>
                    <div className="relative">
                      <ArrowUpDown className="absolute left-3.5 top-3.5 w-4 h-4 text-amber-500 z-10" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full bg-slate-900/60 backdrop-blur-sm border border-white/10 text-slate-200 pl-10 pr-10 py-3 rounded-xl focus:ring-1 focus:ring-amber-500/50 outline-none appearance-none transition-all text-sm"
                      >
                        <option value="relevance" className="bg-slate-900">Relevance</option>
                        <option value="cutoff_high" className="bg-slate-900">Cutoff (High to Low)</option>
                        <option value="cutoff_low" className="bg-slate-900">Cutoff (Low to High)</option>
                        <option value="name" className="bg-slate-900">Name (A-Z)</option>
                      </select>
                      <ChevronRight className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-600 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* --- RESULTS INFO --- */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-2">
             <div className="flex items-baseline gap-3">
               <span className="text-4xl font-bold text-white font-mono tracking-tighter drop-shadow-lg">
                 {filteredData.length}
               </span>
               <span className="text-sm text-slate-400 uppercase tracking-widest font-semibold">
                 Institutes Found
               </span>
             </div>
             
             {/* COMPARE INDICATOR (FLOATING) */}
             {compareList.length > 0 && (
                <button 
                  onClick={() => setShowCompareModal(true)}
                  className="fixed bottom-24 right-6 z-50 flex items-center gap-3 bg-indigo-600 text-white px-5 py-3 rounded-full shadow-[0_0_30px_rgba(79,70,229,0.5)] hover:bg-indigo-500 transition-all border border-indigo-400/50 animate-bounce-in"
                >
                  <Split className="w-5 h-5" />
                  <span className="font-bold">Compare ({compareList.length}/2)</span>
                </button>
             )}
          </div>

          {/* --- COLLEGE LIST --- */}
          <div className="space-y-6">
            {filteredData.length > 0 ? (
              filteredData.map((college, idx) => (
                <div 
                  key={college.id} 
                  className="group relative backdrop-blur-xl bg-white/[0.03] rounded-2xl border border-white/10 overflow-hidden transition-all duration-500 hover:bg-white/[0.07] hover:border-white/20 hover:shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] hover:-translate-y-1"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-white/5 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex gap-5">
                        <div className="hidden sm:flex h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 items-center justify-center border border-white/10 shadow-inner">
                          <Building2 className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                             <span className="text-[10px] font-mono font-bold text-slate-500 bg-black/30 px-2 py-0.5 rounded border border-white/5">
                               #{college.id}
                             </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              {getCollegeRegion(college)}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-white leading-tight group-hover:text-cyan-100 transition-colors">
                            {college.name}
                          </h3>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Compare Button */}
                        <button 
                          onClick={(e) => toggleCompare(college.id, e)}
                          className={`p-2.5 rounded-xl border transition-all ${
                            compareList.includes(college.id) 
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' 
                            : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                          }`}
                          title="Compare"
                        >
                          <Split className="w-4 h-4" />
                        </button>

                        {/* Shortlist Button */}
                        <button 
                          onClick={(e) => toggleShortlist(college.id, e)}
                          className={`p-2.5 rounded-xl border transition-all ${
                            shortlist.includes(college.id) 
                            ? 'bg-pink-500/20 border-pink-500/50 text-pink-400' 
                            : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                          }`}
                          title="Shortlist"
                        >
                          <Heart className={`w-4 h-4 ${shortlist.includes(college.id) ? 'fill-pink-400' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Branches List */}
                  <div className="bg-black/20">
                    {college.branches.map((branch) => {
                      const roundCutoffs = branch.cutoffs?.[filters.capRound];
                      const cutoff = roundCutoffs ? roundCutoffs[filters.category] : null;
                      const userPercent = parseFloat(filters.percentage);
                      const chance = getChanceLevel(userPercent, cutoff);
                      const styles = getChanceStyles(chance);
                      
                      return (
                        <div 
                          key={branch.code} 
                          className="p-4 md:px-6 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                        >
                          <div className="md:col-span-8">
                            <h4 className="text-slate-200 font-medium text-sm md:text-base mb-1 group-hover/branch:text-white">
                              {branch.name}
                            </h4>
                            <span className="text-xs text-slate-600 font-mono tracking-tight">
                              CODE: {branch.code}
                            </span>
                          </div>
                          
                          <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-4">
                            {cutoff ? (
                              <div className="text-right">
                                <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">
                                  {filters.category}
                                </div>
                                <div className="text-lg font-bold font-mono text-cyan-50">
                                  {cutoff.toFixed(2)}<span className="text-xs text-cyan-500/70 ml-0.5">%</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-right opacity-40">
                                <div className="text-[9px] uppercase tracking-widest">N/A</div>
                              </div>
                            )}

                            {filters.percentage && cutoff ? (
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md ${styles.bg} ${styles.border} ${styles.text} ${styles.glow} transition-all duration-300`}>
                                {styles.icon}
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                  {chance === 'high' ? 'Safe' : chance === 'moderate' ? 'Likely' : 'Risky'}
                                </span>
                              </div>
                            ) : (
                               <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-slate-500">
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
              <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
                <div className="p-6 bg-slate-900/80 rounded-full mb-6 ring-1 ring-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)]">
                  <BarChart3 className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-xl font-medium text-white tracking-wide">No Data Found</h3>
                <p className="text-slate-500 mt-2 text-center max-w-sm text-sm">
                  {showShortlistOnly ? "Your shortlist is empty." : "Adjust filters to explore more options."}
                </p>
                <button 
                  onClick={() => {
                    setFilters({ ...filters, searchQuery: "", region: "All", percentage: "", branchGroup: "All Branches" });
                    setShowShortlistOnly(false);
                  }}
                  className="mt-8 px-6 py-2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
                >
                  Reset Parameters
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- SCROLL TO TOP --- */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 left-6 z-50 p-3 rounded-full bg-slate-900/40 backdrop-blur-md border border-white/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all duration-500 hover:bg-cyan-500/20 hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:-translate-y-1 group ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-6 h-6 group-hover:animate-bounce" />
      </button>

      {/* --- COMPARE MODAL --- */}
      {showCompareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl transition-all" onClick={() => setShowCompareModal(false)}></div>
          <div className="relative w-full max-w-5xl h-[80vh] bg-slate-900/80 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Scale className="w-6 h-6 text-indigo-400" />
                Comparison View
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={downloadComparison}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all text-xs font-bold uppercase tracking-wide"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button onClick={() => setShowCompareModal(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Comparison Content */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-px bg-white/5">
              {compareList.map(id => {
                const college = COLLEGE_DATA.find(c => c.id === id);
                return college ? (
                  <div key={id} className="bg-slate-950/40 p-6 flex flex-col gap-6 first:rounded-bl-2xl last:rounded-br-2xl">
                    <div>
                      <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded mb-2 inline-block border border-indigo-500/20">#{college.id}</span>
                      <h3 className="text-xl font-bold text-white leading-tight">{college.name}</h3>
                      <div className="flex gap-2 mt-3">
                        <span className="text-xs border border-white/10 px-2 py-1 rounded text-slate-400 bg-white/5">{college.region}</span>
                        <span className="text-xs border border-white/10 px-2 py-1 rounded text-slate-400 bg-white/5">{college.type}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-white/10 pb-2 flex justify-between">
                        <span>Cutoffs</span>
                        <span className="text-indigo-400">{filters.category}</span>
                      </h4>
                      {college.branches.map(branch => {
                        const cutoff = branch.cutoffs?.[filters.capRound]?.[filters.category];
                        return (
                          <div key={branch.code} className="flex justify-between items-start text-sm group">
                            <span className="text-slate-300 w-2/3 pr-2 group-hover:text-white transition-colors">{branch.name}</span>
                            <span className={`font-mono font-bold ${cutoff ? 'text-cyan-400' : 'text-slate-600'}`}>
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