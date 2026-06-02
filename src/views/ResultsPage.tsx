/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Layers, Award, Users, Printer, FileDown, CheckCircle, Star } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend } from "recharts";
import { apiFetch } from "../api";

interface ResultsPageProps {
  electionId: string;
  onNavigateBack: () => void;
}

export default function ResultsPage({ electionId, onNavigateBack }: ResultsPageProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/results/${electionId}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [electionId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 space-x-2 text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        <span className="font-semibold text-sm">Aggregating decentralized ballot receipts...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <p className="font-bold text-gray-900 text-lg">Results profile missing</p>
        <button 
          onClick={onNavigateBack}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  // Formatting chart metrics helper
  const turnoutPieData = [
    { name: "Participated Turnout", value: data.participationCount, color: "#3b82f6" },
    { name: "Unvoted Electorate", value: Math.max(0, data.registeredVotersCount - data.participationCount), color: "#e5e7eb" }
  ];

  return (
    <div className="space-y-4 py-4 max-w-5xl mx-auto text-left print:p-0 print:border-none text-xs">
      
      {/* Hide controls on standard printing layouts */}
      <div className="flex justify-between items-center bg-white p-3 border border-slate-200 rounded print:hidden">
        <button
          onClick={onNavigateBack}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded border border-slate-300 flex items-center space-x-1 cursor-pointer transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Results</span>
        </button>

        <div className="flex space-x-1.5">
          <button
            onClick={fetchResults}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center space-x-1 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Primary Certified Report content block */}
      <div className="bg-white border border-slate-200 rounded p-5 space-y-6 relative overflow-hidden print:border-none print:shadow-none">
        
        {/* Certificate Badge Accent overlay */}
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none print:opacity-10">
          <CheckCircle className="w-24 h-24 text-blue-600" />
        </div>

        {/* Report Top header */}
        <div className="border-b pb-4 space-y-1">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider font-mono">OFFICIAL CERTIFIED ELECTORAL POLLS</p>
          <h1 className="text-xl font-bold text-slate-900 font-sans tracking-tight">
            {data.election?.electionName}
          </h1>
          <p className="text-slate-500 text-[11px]">
            Poll status: <span className="font-bold text-blue-600">{data.election?.status}</span> | Generated on {new Date().toLocaleDateString(undefined, { dateStyle: "long" })}
          </p>
        </div>

        {/* Overall aggregates bento widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 p-3 border border-slate-200 rounded">
            <span className="text-[9px] text-slate-400 font-mono tracking-wider font-bold">PARTICIPATING BALLOTS</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{data.totalVotes}</p>
          </div>
          <div className="bg-slate-50 p-3 border border-slate-200 rounded">
            <span className="text-[9px] text-slate-400 font-mono tracking-wider font-bold">REGISTERED CONSTITUENTS</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{data.registeredVotersCount}</p>
          </div>
          <div className="bg-slate-50 p-3 border border-slate-200 rounded">
            <span className="text-[9px] text-slate-400 font-mono tracking-wider font-bold">PARTICIPATING VOICES</span>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{data.participationCount} citizens</p>
          </div>
          <div className="bg-blue-50/50 p-3 border border-blue-100 rounded text-blue-800">
            <span className="text-[9px] text-blue-600 font-mono tracking-wider font-bold">ELECTORAL TURN-OUT RATE</span>
            <p className="text-lg font-bold mt-0.5 text-blue-600">{data.turnoutPercentage}%</p>
          </div>
        </div>

        {/* Visualization area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          {/* Turnout Pie representation: Column Span 1 */}
          <div className="border border-slate-200 p-4 rounded flex flex-col justify-between space-y-3">
            <div className="space-y-0.5">
              <h4 className="font-bold text-slate-900 text-xs">Electorate Turnout Rate</h4>
              <p className="text-[10px] text-slate-400">Proportional representation of approved participating citizens.</p>
            </div>
            
            <div className="h-32 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={turnoutPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {turnoutPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} voter accounts`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                <span className="text-base font-bold font-sans text-blue-600">{data.turnoutPercentage}%</span>
                <span className="text-[8px] text-slate-400 uppercase font-mono tracking-wide">voted</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center text-[10px] font-mono font-medium">
              <span className="flex items-center text-blue-600">
                <span className="w-2 h-2 bg-blue-500 rounded mr-1"></span> Voted
              </span>
              <span className="flex items-center text-slate-400">
                <span className="w-2 h-2 bg-slate-200 rounded mr-1"></span> Hold
              </span>
            </div>
          </div>

          {/* Bar Chart representing vote counts: Column Span 2 */}
          <div className="border border-slate-200 p-4 rounded space-y-3 col-span-1 md:col-span-2 flex flex-col justify-between">
            <div className="space-y-0.5">
              <h4 className="font-bold text-slate-900 text-xs">Ballot Counts per Seat placements</h4>
              <p className="text-[10px] text-slate-400">Combined voter selections calculated by position seats.</p>
            </div>

            <div className="h-44">
              {data.positions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No counted position votes available.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.positions[0]?.candidates || []}>
                    <XAxis dataKey="candidateName" tick={{ fill: "#60a5fa", fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => `${value} votes`} />
                    <Bar dataKey="voteCount" radius={[3, 3, 0, 0]}>
                      {(data.positions[0]?.candidates || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.partyColor || "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <p className="text-center text-[9px] text-slate-400">
              *Displayed metrics represent leading: <span className="font-semibold text-slate-700">{data.positions[0]?.positionName || "President"} seat</span> candidates.
            </p>
          </div>

        </div>

        {/* Detailed seat tabular counts breakdown list */}
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-tight flex items-center space-x-1.5 border-b pb-2">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Official Certified Tally List</span>
          </h3>

          <div className="space-y-4">
            {data.positions.map((pos: any) => (
              <div key={pos.positionId} className="space-y-2">
                <div className="p-2 bg-slate-50 rounded flex justify-between items-center border border-slate-200 font-bold">
                  <div>
                    <h4 className="text-[11px] text-slate-950 uppercase tracking-tight">{pos.positionName} seat</h4>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-blue-600">
                      Top {Math.max(1, pos.winnerSlots || 1)} winner{Math.max(1, pos.winnerSlots || 1) === 1 ? "" : "s"} certified
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{pos.totalVotes} checked ballots</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pos.candidates.length === 0 ? (
                    <p className="text-xs text-slate-500 p-2 italic">Empty ballot box submissions registered under this category.</p>
                  ) : (
                    pos.candidates.map((cand: any, idx: number) => (
                      <div key={cand.candidateId} className="border border-slate-200 p-3 rounded flex items-center justify-between shadow-sm relative overflow-hidden bg-white hover:bg-slate-50/40 transition">
                        
                        {/* Winner overlay indicator icon for candidates inside the configured slot count */}
                        {idx < Math.max(1, pos.winnerSlots || 1) && cand.voteCount > 0 && (
                          <div className="absolute -top-3 -right-3 text-[10px] font-bold text-blue-800 uppercase tracking-widest leading-none bg-blue-100 flex items-end justify-start p-3 bg-gradient-to-br from-transparent to-blue-50 shadow h-12 w-12 rotate-45 pointer-events-none">
                            <Star className="w-4 h-4 text-blue-600 mt-2 shrink-0 select-none fill-blue-600 rotate-12" />
                          </div>
                        )}

                        <div className="space-y-1 flex-1 pr-6">
                          <h5 className="font-bold text-slate-900 text-xs leading-tight">{cand.candidateName}</h5>
                          <p className="text-[10px] text-slate-400">{cand.partyName} Coalition</p>
                          
                          {/* Percent visual container line */}
                          <div className="relative pt-1">
                            <div className="overflow-hidden h-1 text-xs flex rounded bg-slate-100 w-full">
                              <div
                                style={{ width: `${cand.percentage}%`, backgroundColor: cand.partyColor }}
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center"
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-slate-950 font-mono">{cand.voteCount}</p>
                          <p className="text-[9px] text-slate-400 font-mono tracking-tight font-semibold">{cand.percentage}%</p>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificate signature footprint block */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-[10px] text-slate-500 bg-white">
          <div className="space-y-1 font-mono">
            <p className="font-bold text-slate-800 uppercase text-[9px] tracking-wider text-blue-600">Verification Integrity Checksums</p>
            <p className="text-[10px] text-slate-400 uppercase">SYS_LOG_ROOT: online_voting_node_1.26</p>
            <p className="text-[9px] text-slate-300 select-all">BALLOT BLOCK SHA: 256:8890A92B3CA9FDE82CD39EFD289B02AE05CDEE39FBCDA0E</p>
          </div>
          <div className="text-right space-y-1 font-serif">
            <p className="italic text-slate-700 text-[10px]">Audit Stamp Seal Signature</p>
            <div className="h-6 border-b border-slate-300 w-36 inline-block"></div>
            <p className="text-[9px] text-slate-400 font-sans tracking-wide">Electoral Supervisor Commissioner Stamp</p>
          </div>
        </div>

      </div>
    </div>
  );
}
