
// ✅ FILE: src/pages/dashboard/modes/OfficialResultsDashboard.tsx


import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  LabelList,
  Legend,
} from "recharts";

import DashboardFrame from "../panels/DashboardFrame";
import DashboardTabs from "../shared/DashboardTabs";
import { Grid, Panel, StatCard, Chip } from "../shared/dashboard-ui";

import { listActiveElections } from "../../../shared/services/electionService";
import { listContestsByElection } from "../../../shared/services/contestService";

import { searchElectionStatsOfficial } from "../../../shared/services/stats/electionStatsOfficialService";
import { searchCandidateElectionStatsOfficial } from "../../../shared/services/stats/candidateElectionStatsOfficialService";
import { searchCountyStatsOfficial } from "../../../shared/services/stats/countyStatsOfficialService";
import { searchCandidateCountyStatsOfficial } from "../../../shared/services/stats/candidateCountyStatsOfficialService";
import { searchDistrictStatsOfficial } from "../../../shared/services/stats/districtStatsOfficialService";
import { searchCandidateDistrictStatsOfficial } from "../../../shared/services/stats/candidateDistrictStatsOfficialService";
import { searchCenterStatsOfficial } from "../../../shared/services/stats/centerStatsOfficialService";

type Props = { mode: "TENANT" | "NEC" | "SYSTEM" };

const BASE_COLORS = ["#000080", "#0000CD", "#B80000", "#A800EB", "#03E818", "#0f172a",  "#FFF30A"];

function colorAt(i:number){
  if(i<BASE_COLORS.length) return BASE_COLORS[i];
  return `hsl(${(i*37)%360},65%,45%)`;
}
const num=(v:any,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const fmtNum=(v:any)=>Number.isFinite(Number(v))?Number(v).toLocaleString():"—";
const fmtPct=(v:any,d=1)=>Number.isFinite(Number(v))?`${Number(v).toFixed(d)}%`:"—";
const normalizePct=(v:any)=>Number(v)<=1.2?Number(v)*100:Number(v)||0;

export default function OfficialResultsDashboard({ mode }:Props){

  const [searchParams,setSearchParams]=useSearchParams();
  const electionId=searchParams.get("electionId")??"";
  const contestId=searchParams.get("contestId")??"";
  const [selectedCountyId,setSelectedCountyId]=useState<string>("");
  const [selectedDistrictId,setSelectedDistrictId]=useState<string>("");

  // ================== Elections
  const electionsQ=useQuery({queryKey:["elections"],queryFn:listActiveElections});
  useEffect(()=>{
    if(!electionId&&electionsQ.data?.length){
      setSearchParams({electionId:electionsQ.data[0].electionId});
    }
  },[electionsQ.data]);

  // ================== Contests
  const contestsQ=useQuery({
    queryKey:["contests",electionId],
    enabled:Boolean(electionId),
    queryFn:()=>listContestsByElection(electionId)
  });

  useEffect(()=>{
    if(!contestId&&contestsQ.data?.length){
      const pres=contestsQ.data.find((c:any)=>c.contestName.toLowerCase().includes("presiden"));
      setSearchParams({
        electionId,
        contestId:pres?.contestId||contestsQ.data[0].contestId
      });
    }
  },[contestsQ.data]);

  // ================== Summary
  const scoreQ=useQuery({
    queryKey:["score",electionId,contestId],
    enabled:Boolean(electionId),
    queryFn:()=>searchElectionStatsOfficial({electionId,contestId,size:1})
  });

  const scoreRow=scoreQ.data?.content?.[0];
  const ballots=num(scoreRow?.ballotsCast);
  const valid=num(scoreRow?.validVotes);

  const score={
    registered:num(scoreRow?.registeredVoters),
    ballots,
    valid,
    invalid:num(scoreRow?.invalidTotal),
    turnout:num(scoreRow?.turnoutPct),
    invalidPct:num(scoreRow?.invalidPct),
    reportingPct:normalizePct(scoreRow?.reportingPct),
    centersReported:num(scoreRow?.centersReported),
    centersTotal:num(scoreRow?.centersTotal),
    validPct:ballots>0?(valid/ballots)*100:0
  };

  // ================== Candidates
  const candQ=useQuery({
    queryKey:["candidates",electionId,contestId],
    enabled:Boolean(electionId)&&Boolean(contestId),
    queryFn:()=>searchCandidateElectionStatsOfficial({electionId,contestId,size:500})
  });

  const candidates=candQ.data?.content??[];
  const sorted=useMemo(()=>[...candidates].sort((a,b)=>num(b.candidateVotes)-num(a.candidateVotes)),[candidates]);
  const top4=sorted.slice(0,4);
  const winner=sorted[0];
  const runnerUp=sorted[1];

  const colorMap=useMemo(()=>{
    const m:Record<string,string>={};
    sorted.forEach((c:any,i)=>m[c.candidateId]=colorAt(i));
    return m;
  },[sorted]);

  // ================== County Stats
  const countyQ=useQuery({
    queryKey:["counties",electionId,contestId],
    enabled:Boolean(electionId)&&Boolean(contestId),
    queryFn:()=>searchCountyStatsOfficial({electionId,contestId,size:50})
  });

  const counties=countyQ.data?.content??[];

  useEffect(()=>{
    if(counties.length&&!selectedCountyId){
      const mont=counties.find((c:any)=>c.countyName.toLowerCase().includes("montserrado"));
      setSelectedCountyId(mont?.countyId||counties[0].countyId);
    }
  },[counties]);

  // ================== District Stats
  const districtQ=useQuery({
    queryKey:["districts",electionId,contestId,selectedCountyId],
    enabled:Boolean(selectedCountyId),
    queryFn:()=>searchDistrictStatsOfficial({
      electionId,contestId,countyId:selectedCountyId,size:200
    })
  });
  const districts=districtQ.data?.content??[];

  useEffect(()=>{
    if(districts.length&&!selectedDistrictId){
      setSelectedDistrictId(districts[0].districtId);
    }
  },[districts]);

  // ================== Polling Center Stats
  const centerQ=useQuery({
    queryKey:["centers",electionId,contestId,selectedCountyId,selectedDistrictId],
    enabled:Boolean(selectedCountyId)&&Boolean(selectedDistrictId),
    queryFn:()=>searchCenterStatsOfficial({
      electionId,contestId,countyId:selectedCountyId,districtId:selectedDistrictId,size:500
    })
  });
  const centers=centerQ.data?.content??[];

  // ================== Candidate County Share
  const countyCandQ=useQuery({
    queryKey:["countyShare",electionId,contestId],
    enabled:Boolean(electionId)&&Boolean(contestId),
    queryFn:()=>searchCandidateCountyStatsOfficial({electionId,contestId,size:5000})
  });

  const countyRows=countyCandQ.data?.content??[];

  // ✅ FIXED: Add candidate vote share % to legend
  const countyShare=useMemo(()=>{
    const grouped:any={};
    countyRows.forEach((r:any)=>{
      if(!grouped[r.countyName]) grouped[r.countyName]={county:r.countyName};
      grouped[r.countyName][r.candidateId]=normalizePct(r.voteSharePct);
    });
    return Object.values(grouped).sort((a:any,b:any)=>String(a.county).localeCompare(String(b.county)));
  },[countyRows]);

  // ================== Candidate District Share
  const candDistrictQ=useQuery({
    queryKey:["candDistrict",electionId,contestId,selectedCountyId],
    enabled:Boolean(selectedCountyId),
    queryFn:()=>searchCandidateDistrictStatsOfficial({
      electionId,contestId,countyId:selectedCountyId,size:500
    })
  });
  const candDistrictRows=candDistrictQ.data?.content??[];

  const districtShare=useMemo(()=>{
    const grouped:any={};
    candDistrictRows.forEach((r:any)=>{
      if(!grouped[r.districtName]) grouped[r.districtName]={district:r.districtName};
      grouped[r.districtName][r.candidateId]=normalizePct(r.voteSharePct);
    });
    return Object.values(grouped).sort((a:any,b:any)=>String(a.district).localeCompare(String(b.district)));
  },[candDistrictRows]);

  // ✅ CORRECTED: Margin % = Winner % - Runner-Up %
  const marginAnalysis=useMemo(()=>{
    if(!winner||!runnerUp) return null;
    const winnerPct=normalizePct(winner.voteSharePct);
    const runnerUpPct=normalizePct(runnerUp.voteSharePct);
    const marginPct=winnerPct-runnerUpPct;
    const marginVotes=num(winner.candidateVotes)-num(runnerUp.candidateVotes);
    return {
      winner:winner.candidateName,
      winnerVotes:num(winner.candidateVotes),
      winnerPct,
      runnerUp:runnerUp.candidateName,
      runnerUpVotes:num(runnerUp.candidateVotes),
      runnerUpPct,
      marginVotes,
      marginPct,
    };
  },[winner,runnerUp]);

  // ✅ Winner's Strongest Counties
  const winnerCounties=useMemo(()=>{
    if(!winner) return [];
    return countyRows
      .filter((r:any)=>r.candidateId===winner.candidateId)
      .sort((a:any,b:any)=>num(b.candidateVotes)-num(a.candidateVotes))
      .slice(0,8);
  },[winner,countyRows]);

  // ✅ Top Performing Centers (by selected county/district)
  const topCenters=useMemo(()=>{
    return [...centers]
      .sort((a:any,b:any)=>num(b.validVotes)-num(a.validVotes))
      .slice(0,8)
      .map((c:any)=>({
        name:c.centerName||c.centerCode||"Unknown",
        votes:num(c.validVotes),
        turnout:normalizePct(c.turnoutPct),
      }));
  },[centers]);

  return(
  <>
    <DashboardTabs mode={mode} isOfficialPublished={true}/>
    <DashboardFrame
      title="NEC Official Results Dashboard"
      subtitle="Certified Official Results — Republic of Liberia"
      right={
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={electionId}
            onChange={e=>setSearchParams({electionId:e.target.value})}
            className="h-9 rounded-xl border px-3 text-sm font-bold"
          >
            {electionsQ.data?.map((e:any)=>(
              <option key={e.electionId} value={e.electionId}>
                {e.electionName}
              </option>
            ))}
          </select>

          <select
            value={contestId}
            onChange={e=>setSearchParams({electionId,contestId:e.target.value})}
            className="h-9 rounded-xl border px-3 text-sm font-bold"
          >
            {contestsQ.data?.map((c:any)=>(
              <option key={c.contestId} value={c.contestId}>
                {c.contestName}
              </option>
            ))}
          </select>

          <Chip text="OFFICIAL — PUBLISHED" tone="green"/>
        </div>
      }
    >

    {/* 1 SUMMARY */}
    <Panel title="Official Summary">
      <Grid columns={4}>
        <StatCard label="Registered Voters" value={fmtNum(score.registered)}/>
        <StatCard label="Ballots Cast" value={fmtNum(score.ballots)}/>
        <StatCard label="Valid Votes" value={fmtNum(score.valid)}/>
        <StatCard label="Valid %" value={fmtPct(score.validPct)}/>
        <StatCard label="Invalid Votes" value={fmtNum(score.invalid)}/>
        <StatCard label="Invalid %" value={fmtPct(score.invalidPct)}/>
        <StatCard label="Turnout %" value={fmtPct(score.turnout)}/>
        <StatCard
          label="Centers Reported"
          value={`${fmtNum(score.centersReported)} / ${fmtNum(score.centersTotal)}`}
          helper={`Reporting: ${fmtPct(score.reportingPct)}`}
        />
      </Grid>
    </Panel>

    {/* ✅ 2 WINNER HIGHLIGHT - CORRECTED MARGIN */}
    {marginAnalysis && (
      <Panel title="🏆 Official Winner" subtitle="With margin of victory over runner-up">
        <div className="rounded-xl border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-5xl font-extrabold text-green-900">
                {marginAnalysis.winner}
              </div>
              <div className="text-lg text-green-800 font-bold mt-2">
                {winner?.partyCode && `(${winner.partyCode})`}
              </div>
              <div className="mt-4 space-y-2 text-sm text-green-900">
                <div><span className="font-bold">Total Votes:</span> {fmtNum(marginAnalysis.winnerVotes)}</div>
                <div><span className="font-bold">Vote Share:</span> {fmtPct(marginAnalysis.winnerPct)}</div>
              </div>
            </div>
            <div className="border-l-2 border-green-300 pl-6">
              <div className="text-sm font-bold text-green-700 uppercase tracking-wide">Margin of Victory</div>
              <div className="text-3xl font-extrabold text-green-900 mt-2">
                +{fmtNum(marginAnalysis.marginVotes)}
              </div>
              <div className="text-lg text-green-800 font-bold mt-1">
                ({fmtPct(marginAnalysis.marginPct)})
              </div>
              <div className="text-lg text-green-700 mt-4 font-bold">
                {marginAnalysis.winner} {fmtPct(marginAnalysis.winnerPct)} vs {marginAnalysis.runnerUp} {fmtPct(marginAnalysis.runnerUpPct)}
              </div>
            </div>
          </div>
        </div>
      </Panel>
    )}

    {/* 2 TOP 4 + WINNER'S COUNTIES */}
    <div className="mt-8 grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-6">
        <Panel title="Top 4 Candidates — National Results">
          <div className="grid grid-cols-13 gap-2 items-center text-18px">
            <div className="col-span-7 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={top4}
                    dataKey="candidateVotes"
                    innerRadius={70}
                    outerRadius={120}
                    label={({percent})=>percent?`${(percent*100).toFixed(1)}%`:""}
                  >
                    {top4.map((c:any)=>(
                      <Cell key={c.candidateId} fill={colorMap[c.candidateId]}/>
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="col-span-5 space-y-3">
              {top4.map((c:any,idx)=>(
                <div key={c.candidateId} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-sm font-bold text-white flex items-center justify-center text-12px" style={{background:colorMap[c.candidateId]}}>
                      {idx+1}
                    </span>
                    <span className="font-semibold text-black text-14px">
                      {c.candidateName} ({c.partyCode})
                    </span>
                  </div>
                  <span className="font-bold text-14px">{fmtNum(c.candidateVotes)}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* ✅ 3. WINNER'S STRONGEST COUNTIES - REDUCED HEIGHT + SPACING */}
      <div className="col-span-12 lg:col-span-6">
        <Panel title="Winner's Strongest Counties">
          <div className="h-[320px] overflow-y-auto pr-2 text-[12px]">
            {winnerCounties.map((r:any)=>(
              <div key={r.countyId} className="flex justify-between items-center p-1.5 border-b hover:bg-blue-50 rounded text-lg">
                <span className="font-semibold text-slate-900">{r.countyName}</span>
                <div className="text-right text-base">
                  <div className="font-bold">{fmtPct(normalizePct(r.voteSharePct))}</div>
                  <div className="text-sm">{fmtNum(r.candidateVotes)}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>

    {/* 3 FULL RANKING */}
    <div className="mt-8 text-base">
      <Panel title="Full Candidate Ranking">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart layout="vertical" data={sorted} margin={{left:140}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis type="number" domain={[0,100]} tickFormatter={(v)=>`${v}%`}/>
            <YAxis type="category" dataKey="candidateName" width={220} tick={{fontSize:18}}/>
            <Tooltip/>
            <Bar dataKey="voteSharePct" radius={[0,8,8,0]}>
              <LabelList
                dataKey="voteSharePct"
                position="right"
                formatter={(v:any)=>fmtPct(normalizePct(v))}
              />
              {sorted.map((c:any)=>(
                <Cell key={c.candidateId} fill={colorMap[c.candidateId]}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>

    {/* ✅ 5. COUNTY & DISTRICT SHARE % - SIDE BY SIDE - USING LABELLIST FOR ACTUAL % */}
    <div className="mt-8 grid grid-cols-12 gap-6">
      {/* County Share - WITH LABELLIST */}
      <div className="col-span-12 lg:col-span-6">
        <Panel title="Candidate County Share %">
          <ResponsiveContainer width="100%" height={430}>
            <BarChart
              data={countyShare}
              margin={{ top: 10, right: 20, left: 10, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="county"
                interval={0}
                angle={-25}
                textAnchor="end"
                height={70}
                tick={{fontSize:14}}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                interval={0}
                allowDecimals={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
                formatter={(value: any) => `${num(value).toFixed(2)}%`}
                labelFormatter={(label) => `County: ${label}`}
              />
              {sorted.map((c: any) => (
                <Bar
                  key={c.candidateId}
                  dataKey={c.candidateId}
                  stackId="a"
                  fill={colorMap[c.candidateId]}
                  isAnimationActive={false}
                >
                  {/* ✅ LabelList uses actual bar segment value, not cumulative */}
                  <LabelList
                    dataKey={c.candidateId}
                    position="center"
                    formatter={(value: any) => {
                      const pctVal = num(value);
                      return pctVal > 2 ? `${pctVal.toFixed(2)}%` : "";
                    }}
                    fill="white"
                    fontSize={12}
                    fontWeight="bold"
                  />
                </Bar>
              ))}

              {/* ✅ UPDATED: Legend with candidate name + vote share % */}
              <Legend
                verticalAlign="bottom"
                align="center"
                content={() => (
                  <div
                    style={{
                      width: "100%",
                      paddingTop: 20,
                    }}
                    className="grid grid-cols-3 gap-4 text-[16px]"
                  >
                    {sorted.map((c: any) => {
                      const pct = normalizePct(c.voteSharePct);

                      return (
                        <div
                          key={c.candidateId}
                          className="flex items-center gap-3"
                        >
                          {/* Color box */}
                          <span
                            className="h-4 w-4 rounded-sm"
                            style={{ backgroundColor: colorMap[c.candidateId] }}
                          />

                          {/* Candidate name in black 16px */}
                          <span className="text-black font-semibold text-[16px]">
                            {c.candidateName} ({c.partyCode}) {fmtPct(pct)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* ✅ DISTRICT SHARE - WITH COUNTY FILTER + LABELLIST FOR ACTUAL % */}
      <div className="col-span-12 lg:col-span-6">
        <Panel title={`Candidate District Share % — ${counties.find((c:any)=>c.countyId===selectedCountyId)?.countyName}`}>
          <div className="mb-4">
            <label className="block text-sm font-bold text-slate-600 mb-2">Select County</label>
            <select
              value={selectedCountyId}
              onChange={e=>setSelectedCountyId(e.target.value)}
              className="w-full h-9 rounded-lg border px-3 text-base font-bold"
            >
              {counties.map((c:any)=>(
                <option key={c.countyId} value={c.countyId}>
                  {c.countyName}
                </option>
              ))}
            </select>
          </div>

          {districtShare.length>0?(
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={districtShare} margin={{top:10,right:20,left:10,bottom:80}}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="district" interval={0} angle={-25} textAnchor="end" height={70} tick={{fontSize:14}}/>

                {/* ✅ FIXED: Ticks now show 0, 25, 50, 75, 100 */}
                <YAxis
                  type="number"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  interval={0}
                  allowDecimals={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.98)",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                  formatter={(value: any) => `${num(value).toFixed(2)}%`}
                  labelFormatter={(label) => `District: ${label}`}
                />
                {sorted.map((c:any)=>(
                  <Bar 
                    key={c.candidateId} 
                    dataKey={c.candidateId} 
                    stackId="a" 
                    fill={colorMap[c.candidateId]} 
                    isAnimationActive={false}
                  >
                    {/* ✅ LabelList uses actual bar segment value, not cumulative */}
                    <LabelList
                      dataKey={c.candidateId}
                      position="center"
                      formatter={(value: any) => {
                        const pctVal = num(value);
                        return pctVal > 2 ? `${pctVal.toFixed(2)}%` : "";
                      }}
                      fill="white"
                      fontSize={12}
                      fontWeight="bold"
                    />
                  </Bar>
                ))}
                {/* ✅ UPDATED: Black legend with square box + candidate name + vote share % */}
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  content={() => (
                    <div
                      style={{
                        width: "100%",
                      }}
                      className="grid grid-cols-3 gap-4 text-[16px]"
                    >
                      {sorted.map((c: any) => {
                        const pct = normalizePct(c.voteSharePct);

                        return (
                          <div
                            key={c.candidateId}
                            className="flex items-center gap-3"
                          >
                            {/* Color box */}
                            <span
                              className="h-4 w-4 rounded-sm"
                              style={{ backgroundColor: colorMap[c.candidateId] }}
                            />

                            {/* Candidate name in black 16px */}
                            <span className="text-black font-semibold text-[16px]">
                              {c.candidateName} ({c.partyCode}) {fmtPct(pct)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          ):(
            <div className="text-center py-10 text-slate-600 text-sm">No district data available for selected county</div>
          )}
        </Panel>
      </div>
    </div>

    {/* 5 COUNTY + DISTRICT REPORTING */}
    <div className="mt-8 grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-6">
        <Panel title="County Reporting %">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={counties}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="countyName" interval={0} angle={-25} textAnchor="end" height={70} tick={{fontSize:14}}/>
              <YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`}/>
              <Tooltip formatter={(v:any)=>fmtPct(v,1)}/>
              <Bar dataKey="reportingPct" fill="#0000CD" radius={[8,8,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="col-span-12 lg:col-span-6">
        <Panel title="District Reporting %">
          <div className="mb-4">
            <label className="block text-sm font-bold text-base mb-2">Select County</label>
            <select
              value={selectedCountyId}
              onChange={e=>setSelectedCountyId(e.target.value)}
              className="w-full h-9 rounded-lg border px-3 text-base font-bold"
            >
              {counties.map((c:any)=>(
                <option key={c.countyId} value={c.countyId}>
                  {c.countyName}
                </option>
              ))}
            </select>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={districts}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="districtName" angle={-25} textAnchor="end" height={70} tick={{fontSize:14}}/>
              <YAxis domain={[0,100]} tickFormatter={(v)=>`${v}%`}/>
              <Tooltip formatter={(v:any)=>fmtPct(v,1)}/>
              <Bar dataKey="reportingPct" fill="#B80000" radius={[8,8,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>

    </DashboardFrame>
  </>
  );
}

