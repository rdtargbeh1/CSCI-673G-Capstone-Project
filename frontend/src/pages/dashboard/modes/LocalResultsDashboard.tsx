

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

import { useAuth } from "../../../auth/useAuth";
import { useAuthStore } from "../../../shared/store/authStore";

import { listActiveElections } from "../../../shared/services/electionService";
import { listContestsByElection } from "../../../shared/services/contestService";

import { searchElectionStatsParty } from "../../../shared/services/stats/electionStatsPartyService";
import { searchCandidateElectionStatsParty } from "../../../shared/services/stats/candidateElectionStatsPartyService";
import { searchCountyStatsParty } from "../../../shared/services/stats/countyStatsPartyService";
import { searchCandidateCountyStatsParty } from "../../../shared/services/stats/candidateCountyStatsPartyService";
import { searchDistrictStatsParty } from "../../../shared/services/stats/districtStatsPartyService";
import { searchCandidateDistrictStatsParty } from "../../../shared/services/stats/candidateDistrictStatsPartyService";
import { searchCenterStatsParty } from "../../../shared/services/stats/centerStatsPartyService";

import { fetchOrganizationById } from "../../../shared/services/organizationService";
import { useTenantOfficialPublished } from "../shared/hooks/useTenantOfficialPublished";

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

export default function LocalResultsDashboard({ mode }:Props){

  const auth: any = useAuth();
  const [searchParams,setSearchParams]=useSearchParams();
  const electionId=searchParams.get("electionId")??"";
  const contestId=searchParams.get("contestId")??"";
  const [selectedCountyId,setSelectedCountyId]=useState<string>("");
  const [selectedDistrictId,setSelectedDistrictId]=useState<string>("");

  // ✅ Get orgId from auth store
  const storeOrgId = String(useAuthStore((s: any) => s.currentOrgId ?? "") ?? "").trim();
  const fallbackOrgId = String(useAuthStore.getState().tenantMeta?.orgId ?? auth?.tenant?.orgId ?? "").trim();
  const orgId = storeOrgId || fallbackOrgId || "";

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

  // ================== Org Meta
  const orgQ = useQuery({
    queryKey: ["org", "by-id", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => fetchOrganizationById(String(orgId)),
    staleTime: 60_000,
    retry: 1,
  });

  const orgPartyName = String((orgQ.data as any)?.partyName ?? "").trim();
  const orgPartyAbbrev = String((orgQ.data as any)?.partyAbbreviation ?? "").trim();

  const isOfficialPublished = useTenantOfficialPublished().data === true;

  // ================== Summary
  const scoreQ=useQuery({
    queryKey:["score",orgId,electionId,contestId],
    enabled:Boolean(orgId)&&Boolean(electionId),
    queryFn:()=>searchElectionStatsParty({orgId,electionId,contestId,size:1})
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
    queryKey:["candidates",orgId,electionId,contestId],
    enabled:Boolean(orgId)&&Boolean(electionId)&&Boolean(contestId),
    queryFn:()=>searchCandidateElectionStatsParty({orgId,electionId,contestId,size:500})
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
    queryKey:["counties",orgId,electionId,contestId],
    enabled:Boolean(orgId)&&Boolean(electionId)&&Boolean(contestId),
    queryFn:()=>searchCountyStatsParty({orgId,electionId,contestId,size:50})
  });

  const counties=countyQ.data?.content??[];

  useEffect(()=>{
    if(counties.length&&!selectedCountyId){
      setSelectedCountyId(counties[0].countyId);
    }
  },[counties]);

  // ================== District Stats
  const districtQ=useQuery({
    queryKey:["districts",orgId,electionId,contestId,selectedCountyId],
    enabled:Boolean(orgId)&&Boolean(electionId)&&Boolean(contestId)&&Boolean(selectedCountyId),
    queryFn:()=>searchDistrictStatsParty({
      orgId,electionId,contestId,countyId:selectedCountyId,size:200
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
    queryKey:["centers",orgId,electionId,contestId,selectedCountyId,selectedDistrictId],
    enabled:Boolean(orgId)&&Boolean(electionId)&&Boolean(contestId)&&Boolean(selectedCountyId)&&Boolean(selectedDistrictId),
    queryFn:()=>searchCenterStatsParty({
      orgId,electionId,contestId,countyId:selectedCountyId,districtId:selectedDistrictId,size:500
    })
  });
  const centers=centerQ.data?.content??[];

  // ================== Candidate County Share - CALCULATE % ON FRONTEND
  const countyCandQ=useQuery({
    queryKey:["countyShare",orgId,electionId,contestId],
    enabled:Boolean(orgId)&&Boolean(electionId)&&Boolean(contestId),
    queryFn:()=>searchCandidateCountyStatsParty({orgId,electionId,contestId,size:5000})
  });

  const countyRows=countyCandQ.data?.content??[];

  // ✅ County Share - CALCULATE voteSharePct on frontend using (candidateVotes / countyTotal) * 100
  const countyShare=useMemo(()=>{
    const grouped:any={};
    
    // First, group by county and calculate totals
    const countyTotals:any={};
    countyRows.forEach((r:any)=>{
      if(!countyTotals[r.countyName]){
        countyTotals[r.countyName]=0;
      }
      countyTotals[r.countyName]+=num(r.candidateVotes);
    });

    // Now calculate vote share % for each candidate: (candidateVotes / countyTotal) * 100
    countyRows.forEach((r:any)=>{
      if(!grouped[r.countyName]) grouped[r.countyName]={county:r.countyName};
      const countyTotal=countyTotals[r.countyName];
      const voteSharePct=countyTotal>0?(num(r.candidateVotes)/countyTotal)*100:0;
      grouped[r.countyName][r.candidateId]=voteSharePct;
    });
    
    return Object.values(grouped).sort((a:any,b:any)=>String(a.county).localeCompare(String(b.county)));
  },[countyRows]);

  // ================== Candidate District Share - CALCULATE % ON FRONTEND
  const candDistrictQ=useQuery({
    queryKey:["candDistrict",orgId,electionId,contestId,selectedCountyId],
    enabled:Boolean(orgId)&&Boolean(electionId)&&Boolean(contestId)&&Boolean(selectedCountyId),
    queryFn:()=>searchCandidateDistrictStatsParty({
      orgId,electionId,contestId,countyId:selectedCountyId,size:500
    })
  });
  const candDistrictRows=candDistrictQ.data?.content??[];

  // ✅ District Share - CALCULATE voteSharePct on frontend using (candidateVotes / districtTotal) * 100
  const districtShare=useMemo(()=>{
    const grouped:any={};
    
    // First, group by district and calculate totals
    const districtTotals:any={};
    candDistrictRows.forEach((r:any)=>{
      if(!districtTotals[r.districtName]){
        districtTotals[r.districtName]=0;
      }
      districtTotals[r.districtName]+=num(r.candidateVotes);
    });

    // Now calculate vote share % for each candidate: (candidateVotes / districtTotal) * 100
    candDistrictRows.forEach((r:any)=>{
      if(!grouped[r.districtName]) grouped[r.districtName]={district:r.districtName};
      const districtTotal=districtTotals[r.districtName];
      const voteSharePct=districtTotal>0?(num(r.candidateVotes)/districtTotal)*100:0;
      grouped[r.districtName][r.candidateId]=voteSharePct;
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

  // ✅ Top Performing Centers
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

  // ✅ OUR VOTES: Filter candidates by tenant party
  const ourVotes=useMemo(()=>{
    if(!orgPartyName&&!orgPartyAbbrev) return null;

    const rows=(candidates??[]).filter((r:any)=>{
      const pName=String(r.partyName??"").trim().toLowerCase();
      const pCode=String(r.partyCode??"").trim().toLowerCase();
      const orgPN=orgPartyName.trim().toLowerCase();
      const orgPA=orgPartyAbbrev.trim().toLowerCase();
      return (orgPN&&pName===orgPN)||(orgPA&&pCode===orgPA);
    });

    const totalVotes=rows.reduce((acc,r:any)=>acc+num(r.candidateVotes),0);
    const totalShare=rows.reduce((acc,r:any)=>acc+num(r.voteSharePct),0);

    return {count:rows.length,totalVotes,totalSharePct:totalShare};
  },[candidates,orgPartyName,orgPartyAbbrev]);

  if (!orgId) {
    return (
      <>
        <DashboardTabs mode={mode} currentOrgId={undefined} isOfficialPublished={isOfficialPublished} />
        <DashboardFrame title="Local Results Dashboard" subtitle="Party-scoped results">
          <Panel title="Select an Organization first">
            <div className="text-sm text-slate-700 space-y-1">
              <div>• This dashboard is tenant-scoped and requires orgId.</div>
              <div>• Ensure your tenant orgId is loaded into the store.</div>
            </div>
          </Panel>
        </DashboardFrame>
      </>
    );
  }

  return(
  <>
    <DashboardTabs mode={mode} currentOrgId={orgId} isOfficialPublished={isOfficialPublished} />
    <DashboardFrame
      title="Local Results Dashboard"
      subtitle="Party Results — Republic of Liberia"
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

          <Chip text="LOCAL — PARTY RESULTS" tone="blue"/>
        </div>
      }
    >

    {/* 1 SUMMARY */}
    <Panel title="Local Summary">
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

      {/* ✅ OUR VOTES CONTAINER - TENANT SPECIFIC */}
      {ourVotes && (orgPartyName || orgPartyAbbrev) ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-gradient-to-br bg-red-700 from-slate-50  to-slate-100 p-3">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-2xl font-extrabold text-slate-900">
                Our Votes{" "}
                <span className="text-slate-500 font-bold ">
                  ({orgPartyName || "Party"}{orgPartyAbbrev ? ` • ${orgPartyAbbrev}` : ""})
                </span>
              </div>
              <div className="text-base font-bold text-slate-600 mt-0.5">
                Candidates matched: {ourVotes.count}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Votes</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{fmtNum(ourVotes.totalVotes)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">Combined Share</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{fmtPct(ourVotes.totalSharePct, 2)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">Contest</div>
              <div className="text-sm font-extrabold text-slate-900 mt-1">
                {contestId ? (contestsQ.data?.find((c:any)=>c.contestId===contestId)?.contestName||"Contest") : "All contests"}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Panel>

    {/* ✅ 2 WINNER HIGHLIGHT - BLUE THEME */}
    {marginAnalysis && (
      <Panel title="🏆 Local Leader" subtitle="With margin of victory over runner-up">
        <div className="rounded-xl border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-5xl font-extrabold text-blue-900">
                {marginAnalysis.winner}
              </div>
              <div className="text-lg text-blue-800 font-bold mt-2">
                {winner?.partyCode && `(${winner.partyCode})`}
              </div>
              <div className="mt-4 space-y-2 text-sm text-blue-900">
                <div><span className="font-bold">Total Votes:</span> {fmtNum(marginAnalysis.winnerVotes)}</div>
                <div><span className="font-bold">Vote Share:</span> {fmtPct(marginAnalysis.winnerPct)}</div>
              </div>
            </div>
            <div className="border-l-2 border-blue-300 pl-6">
              <div className="text-sm font-bold text-blue-700 uppercase tracking-wide">Margin of Victory</div>
              <div className="text-3xl font-extrabold text-blue-900 mt-2">
                +{fmtNum(marginAnalysis.marginVotes)}
              </div>
              <div className="text-lg text-blue-800 font-bold mt-1">
                ({fmtPct(marginAnalysis.marginPct)})
              </div>
              <div className="text-lg text-blue-700 mt-4 font-bold">
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
        <Panel title="Top 4 Candidates — Local Results">
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

      {/* ✅ 3. WINNER'S STRONGEST COUNTIES */}
      <div className="col-span-12 lg:col-span-6">
        <Panel title="Leader's Strongest Counties">
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

    {/* ✅ 5. CANDIDATE SHARE % BY COUNTY & DISTRICT - STACKED BARS WITH ACTUAL % LABELS (USING LabelList) */}
    <div className="mt-8 grid grid-cols-12 gap-6">
      {/* County Share - STACKED bars with ACTUAL vote share % labels using LabelList */}
      <div className="col-span-12 lg:col-span-6">
        <Panel title="Candidate Vote Share % by County">
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
              {/* ✅ WITH stackId = STACKED bars */}
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
                          <span
                            className="h-4 w-4 rounded-sm"
                            style={{ backgroundColor: colorMap[c.candidateId] }}
                          />

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

      {/* District Share - STACKED bars with ACTUAL vote share % labels using LabelList */}
      <div className="col-span-12 lg:col-span-6">
        <Panel title={`Candidate Vote Share % by District — ${counties.find((c:any)=>c.countyId===selectedCountyId)?.countyName}`}>
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
                {/* ✅ WITH stackId = STACKED bars */}
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
                            <span
                              className="h-4 w-4 rounded-sm"
                              style={{ backgroundColor: colorMap[c.candidateId] }}
                            />

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

