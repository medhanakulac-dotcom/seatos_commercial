import { useState } from "react";

const LOGO = "https://res.cloudinary.com/dkwj2iikl/image/upload/v1773914487/Screenshot_2026-03-19_at_5.00.59_PM_aqryg1.png";
const Lg=({w=150})=><img src={LOGO} alt="seatOS" style={{width:w,height:"auto"}}/>;

const DEF_PRICING={
  THB:{online:10,admin:1600,impl:5200,sms:3,pos:500,kiosk:4000,name:"Thai Baht"},
  USD:{online:0.3,admin:60,impl:150,sms:0.08,pos:16,kiosk:130,name:"US Dollar"},
  PHP:{online:18,admin:2850,impl:8700,sms:5,pos:1000,kiosk:7300,name:"Philippine Peso"},
  IDR:{online:5000,admin:830000,impl:2540700,sms:1356,pos:271000,kiosk:170000000,name:"Indonesian Rupiah"},
  VND:{online:7900,admin:1300000,impl:3900000,sms:2000,pos:420000,kiosk:3210000,name:"Vietnamese Dong"},
};
const DEF_COMPANY={name:"BOOKAWAY LTD.",signName:"Liam Hutchinson",signTitle:"General Manager (SeatOS)",address:"6 HaTa'as St., Ramat Gan, 5251247",email:"chris@seatos.com",phone:"092 845 1000",billingContact:"Chris Medhanakula",billingEmail:"chris@seatos.com",billingPhone:"0928451000"};
const CURRENCIES=["THB","USD","PHP","IDR","VND"];
const COUNTRIES=["Thailand","Indonesia","Philippines","Vietnam","Singapore","Malaysia","Cambodia","Myanmar","Laos","India","Japan","South Korea","Taiwan","Hong Kong","China","Australia","New Zealand","United States","United Kingdom","Germany","France","Netherlands","Israel","United Arab Emirates","Brazil","Mexico","South Africa"];
const TERMS=[{l:"1 Year",m:12},{l:"2 Years",m:24},{l:"3 Years",m:36},{l:"4 Years",m:48},{l:"5 Years",m:60}];
const fN=(n,c)=>{if(!n&&n!==0)return"";const d=["IDR","VND"].includes(c)?0:2;return Number(n).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d})};

const ui={app:{fontFamily:"'Segoe UI',Tahoma,sans-serif",background:"#F5F0EB",minHeight:"100vh"},wrap:{maxWidth:880,margin:"0 auto",padding:"32px 16px 80px"},card:{background:"#fff",borderRadius:16,padding:"24px 28px",marginBottom:20,boxShadow:"0 2px 12px rgba(0,0,0,.06)"},ct:{fontSize:15,fontWeight:700,color:"#E91E8C",marginBottom:14,display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"},g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14},g3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14},lb:{fontSize:11.5,fontWeight:600,color:"#555",marginBottom:3,display:"block"},inp:{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #ddd",fontSize:14,outline:"none",boxSizing:"border-box"},sel:{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #ddd",fontSize:14,outline:"none",boxSizing:"border-box",background:"#fff",cursor:"pointer"},full:{gridColumn:"1/-1"},btn:{padding:"14px 36px",borderRadius:12,border:"none",fontWeight:700,fontSize:16,cursor:"pointer"},pri:{background:"linear-gradient(135deg,#E8850C,#E91E8C)",color:"#fff",boxShadow:"0 4px 20px rgba(232,133,12,.35)"},sec2:{background:"#fff",color:"#E8850C",border:"2px solid #E8850C"},badge:{display:"inline-block",background:"#FFF3E0",color:"#E8850C",fontWeight:700,padding:"3px 12px",borderRadius:8,fontSize:12}};

const Inp=({label,value,onChange,type="text",ph="",style={},disabled=false})=>(<div style={style}><label style={ui.lb}>{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} disabled={disabled} style={{...ui.inp,...(disabled?{background:"#f5f5f5",color:"#999"}:{})}} /></div>);
const Sel=({label,value,onChange,opts,style={}})=>(<div style={style}><label style={ui.lb}>{label}</label><select value={value} onChange={e=>onChange(e.target.value)} style={ui.sel}>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>);
const Chk=({label,value,onChange})=>(<div style={{display:"flex",alignItems:"center",cursor:"pointer",gap:6}} onClick={()=>onChange(!value)}><span style={{width:20,height:20,borderRadius:4,border:value?"2px solid #E8850C":"2px solid #ddd",background:value?"#E8850C":"#fff",color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0}}>{value?"✓":""}</span><span style={{fontSize:14,color:"#555"}}>{label}</span></div>);
const Waive=({on,set})=>(<span style={{display:"inline-flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:11,color:on?"#e53935":"#aaa",fontWeight:600,marginLeft:8}} onClick={()=>set(!on)}><span style={{width:16,height:16,borderRadius:3,border:on?"2px solid #e53935":"2px solid #ccc",background:on?"#e53935":"#fff",color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0}}>{on?"✕":""}</span>Waive</span>);

export default function ContractApp(){
  const[pricing]=useState(JSON.parse(JSON.stringify(DEF_PRICING)));
  const[company]=useState({...DEF_COMPANY});
  const[form,setForm]=useState({
    orderType:"regular",country:"Thailand",currency:"THB",customerName:"",address:"",contactEmail:"",custRegNum:"",
    subStartDate:new Date().toISOString().split("T")[0],termMonths:12,
    onlineFeeMode:"percent",onlineFeePercent:"3",onlineFeeFlat:"",
    offlineFeeMode:"percent",offlineFeePercent:"3",offlineFeeFlat:"",
    adminFee:"",implFee:"",smsFee:"",
    implEnabled:true,smsEnabled:true,
    wOnline:false,wOffline:false,wAdmin:false,wImpl:false,wSms:false,
    posQty:0,kioskQty:0,discount:"",taxes:"",
    custSignName:"",custSignTitle:"",custSignEmail:"",custSignPhone:"",
    billingContact:"",billingEmail:"",billingPhone:"",
    specialTerm1:"Customer undertakes to process all ticket bookings using seatOS.",
    specialTerm2:"Customer agrees to process all offline and online ticket bookings using seatOS only.",
  });
  const[view,setView]=useState("form");
  const up=k=>v=>setForm(p=>({...p,[k]:v}));
  const cur=form.currency;const pr=pricing[cur];

  const getConvDisplay=(mode,pct,flat)=>{if(mode==="percent")return(pct||"3")+"%";return fN(flat!==""?Number(flat):pr.online,cur)};
  const onD=form.wOnline?"Waived":getConvDisplay(form.onlineFeeMode,form.onlineFeePercent,form.onlineFeeFlat);
  const offD=form.wOffline?"Waived":getConvDisplay(form.offlineFeeMode,form.offlineFeePercent,form.offlineFeeFlat);
  const v_admin=form.wAdmin?0:(form.adminFee!==""?Number(form.adminFee):pr.admin);
  const v_impl=form.wImpl?0:(form.implEnabled?(form.implFee!==""?Number(form.implFee):pr.impl):0);
  const v_sms=form.wSms?0:(form.smsEnabled?(form.smsFee!==""?Number(form.smsFee):pr.sms):0);
  const endDate=(()=>{if(!form.subStartDate)return"";const d=new Date(form.subStartDate);d.setMonth(d.getMonth()+form.termMonths);d.setDate(d.getDate()-1);return d.toISOString().split("T")[0]})();
  const bl=(v,fb="")=>v||fb;
  const f=form;const co=company;

  if(view==="preview"){
    const pg={page:{maxWidth:794,background:"#fff",padding:"48px 56px 40px",boxSizing:"border-box",marginBottom:24,boxShadow:"0 2px 16px rgba(0,0,0,.1)",fontFamily:"Arial,Helvetica,sans-serif",fontSize:10,lineHeight:1.5,color:"#222"},hr:{height:2,background:"#000",margin:"4px 0 8px"},title:{fontSize:13,fontWeight:700,textAlign:"center",margin:"12px 0 8px"},tbl:{width:"100%",borderCollapse:"collapse",fontSize:9.5,marginBottom:8},th:{background:"#f5f5f5",border:"1px solid #ccc",padding:"4px 6px",textAlign:"left",fontWeight:700,fontSize:9},td:{border:"1px solid #ccc",padding:"4px 6px",fontSize:9.5,verticalAlign:"top"},tdB:{border:"1px solid #ccc",padding:"4px 6px",fontSize:9.5,fontWeight:700}};
    return(
      <div style={ui.app}>
        <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(245,240,235,.95)",padding:"12px 24px",display:"flex",justifyContent:"center",gap:16,borderBottom:"1px solid #e0d8d0"}}>
          <button style={{...ui.btn,...ui.sec2,padding:"10px 24px",fontSize:14}} onClick={()=>setView("form")}>← Back to Edit</button>
          <button style={{...ui.btn,...ui.pri,padding:"10px 24px",fontSize:14}} onClick={()=>window.print()}>Download PDF</button>
        </div>
        <div style={{maxWidth:840,margin:"24px auto",padding:"0 16px 80px"}}>
          <div style={pg.page}>
            <Lg w={150}/><div style={pg.hr}/>
            <div style={pg.title}>SEATOS SOFTWARE SUBSCRIPTION AND SERVICES AGREEMENT ORDER</div>
            <p style={{fontSize:9,marginBottom:10,textAlign:"justify"}}>This Order is entered into by seatOS, operated by Bookaway Ltd. ("Company") and the entity below ("Customer").</p>
            <div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>CUSTOMER INFORMATION</div>
            <table style={pg.tbl}><tbody>
              <tr><td style={{...pg.tdB,width:"30%"}}>Customer Name</td><td style={pg.td}>{bl(f.customerName)}</td></tr>
              <tr><td style={pg.tdB}>Country</td><td style={pg.td}>{f.country}</td></tr>
              <tr><td style={pg.tdB}>Address</td><td style={pg.td}>{bl(f.address)}</td></tr>
              <tr><td style={pg.tdB}>Email</td><td style={pg.td}>{bl(f.contactEmail)}</td></tr>
              <tr><td style={pg.tdB}>Software</td><td style={pg.td}>SeatOS TMS</td></tr>
            </tbody></table>
            <div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>SUBSCRIPTION TERM</div>
            <table style={pg.tbl}><tbody>
              <tr><td style={pg.tdB}>Start</td><td style={pg.td}>{bl(f.subStartDate)}</td><td style={pg.tdB}>End</td><td style={pg.td}>{bl(endDate)}</td></tr>
            </tbody></table>
            <div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>LICENSES</div>
            <table style={pg.tbl}>
              <thead><tr><th style={pg.th}>Type</th><th style={{...pg.th,width:80}}>Invoicing</th><th style={{...pg.th,width:100}}>Fees ({cur})</th></tr></thead>
              <tbody>
                <tr><td style={pg.td}>Online Convenience Fee</td><td style={pg.td}>Monthly</td><td style={{...pg.td,textAlign:"right"}}>{onD}</td></tr>
                <tr><td style={pg.td}>Offline Convenience Fee</td><td style={pg.td}>Monthly</td><td style={{...pg.td,textAlign:"right"}}>{offD}</td></tr>
                <tr><td style={pg.td}>Admin & Maintenance</td><td style={pg.td}>Monthly</td><td style={{...pg.td,textAlign:"right"}}>{form.wAdmin?"Waived":fN(v_admin,cur)}</td></tr>
              </tbody>
            </table>
            <div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>SERVICES</div>
            <table style={pg.tbl}>
              <thead><tr><th style={pg.th}>Type</th><th style={{...pg.th,width:80}}>Invoicing</th><th style={{...pg.th,width:100}}>Fees ({cur})</th></tr></thead>
              <tbody>
                <tr><td style={pg.td}>Implementation</td><td style={pg.td}>One-time</td><td style={{...pg.td,textAlign:"right"}}>{f.wImpl?"Waived":(!f.implEnabled?"N/A":fN(v_impl,cur))}</td></tr>
                <tr><td style={pg.td}>SMS</td><td style={pg.td}>Monthly</td><td style={{...pg.td,textAlign:"right"}}>{f.wSms?"Waived":(!f.smsEnabled?"N/A":fN(v_sms,cur))}</td></tr>
              </tbody>
            </table>
            <div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>SIGNATURES</div>
            <table style={{...pg.tbl,fontSize:9}}><tbody>
              <tr><td style={pg.tdB}>Customer:</td><td style={pg.td}>{bl(f.customerName)}</td><td style={pg.tdB}>Company:</td><td style={pg.td}>{co.name}</td></tr>
              <tr><td style={pg.td}>Name:</td><td style={pg.td}>{bl(f.custSignName)}</td><td style={pg.td}>Name:</td><td style={pg.td}>{co.signName}</td></tr>
              <tr><td style={pg.td}>Title:</td><td style={pg.td}>{bl(f.custSignTitle)}</td><td style={pg.td}>Title:</td><td style={pg.td}>{co.signTitle}</td></tr>
              <tr><td style={pg.td}>Email:</td><td style={pg.td}>{bl(f.custSignEmail)}</td><td style={pg.td}>Email:</td><td style={pg.td}>{co.email}</td></tr>
            </tbody></table>
          </div>
        </div>
        <style>{`@media print{body{background:#fff!important;-webkit-print-color-adjust:exact}}`}</style>
      </div>
    );
  }

  return(
    <div style={ui.app}><div style={ui.wrap}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><Lg w={180}/></div>
      <h1 style={{fontSize:28,fontWeight:800,color:"#E8850C",marginBottom:4}}>Contract Builder</h1>
      <p style={{fontSize:14,color:"#888",marginBottom:28}}>Generate a SeatOS Software Subscription & Services Agreement.</p>

      <div style={ui.card}><div style={ui.ct}><span>📋 Order Type</span></div>
        <div style={{display:"flex",gap:12}}>
          {["regular","bundle"].map(v=>(<button key={v} onClick={()=>up("orderType")(v)} style={{flex:1,padding:"14px",borderRadius:12,border:form.orderType===v?"2px solid #E8850C":"2px solid #eee",background:form.orderType===v?"#FFF8F0":"#fff",fontWeight:700,fontSize:15,cursor:"pointer",color:form.orderType===v?"#E8850C":"#999"}}>{v==="regular"?"📄 Regular":"📦 Bundle"}</button>))}
        </div>
      </div>

      <div style={ui.card}><div style={ui.ct}><span>🌏 Country & Currency</span></div>
        <div style={ui.g3}>
          <Sel label="Country *" value={form.country} onChange={up("country")} opts={COUNTRIES.map(c=>({v:c,l:c}))}/>
          <Sel label="Currency *" value={form.currency} onChange={up("currency")} opts={CURRENCIES.map(c=>({v:c,l:c+" — "+pricing[c].name}))}/>
          <div><label style={ui.lb}>Rate</label><div style={{padding:"10px 12px",background:"#FFF8F0",borderRadius:10,border:"1.5px solid #E8850C",fontWeight:700,color:"#E8850C",fontSize:14}}>{form.orderType==="bundle"?"Bundle":"Regular"} ({cur})</div></div>
        </div>
      </div>

      <div style={ui.card}><div style={ui.ct}><span>🏢 Company Information</span></div>
        <div style={ui.g2}>
          <Inp label="Customer Name *" value={form.customerName} onChange={up("customerName")} ph="e.g. Acme Travel Co., Ltd."/>
          <Inp label="Registration No." value={form.custRegNum} onChange={up("custRegNum")}/>
          <Inp label="Contact Email *" value={form.contactEmail} onChange={up("contactEmail")} type="email"/>
          <Inp label="Address *" value={form.address} onChange={up("address")} ph="Full company address"/>
        </div>
      </div>

      <div style={ui.card}><div style={ui.ct}><span>📅 Subscription Term</span></div>
        <div style={ui.g3}>
          <Inp label="Start Date *" value={form.subStartDate} onChange={up("subStartDate")} type="date"/>
          <Sel label="Duration *" value={form.termMonths} onChange={v=>up("termMonths")(Number(v))} opts={TERMS.map(x=>({v:x.m,l:x.l}))}/>
          <Inp label="End Date (auto)" value={endDate} onChange={()=>{}} disabled/>
        </div>
      </div>

      <div style={ui.card}><div style={ui.ct}><span>💰 Fees</span><span style={ui.badge}>{cur}</span></div>
        <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><b style={{fontSize:13}}>Online Conv. Fee</b><Waive on={form.wOnline} set={up("wOnline")}/></div>
          {!form.wOnline&&<div style={ui.g2}><Sel label="Mode" value={form.onlineFeeMode} onChange={up("onlineFeeMode")} opts={[{v:"percent",l:"% of transaction"},{v:"flat",l:"Flat "+cur}]}/>{form.onlineFeeMode==="percent"?<Inp label="%" value={form.onlineFeePercent} onChange={up("onlineFeePercent")} ph="3"/>:<Inp label={cur} value={form.onlineFeeFlat} onChange={up("onlineFeeFlat")} ph={String(pr.online)}/>}</div>}
        </div>
        <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><b style={{fontSize:13}}>Offline Conv. Fee</b><Waive on={form.wOffline} set={up("wOffline")}/></div>
          {!form.wOffline&&<div style={ui.g2}><Sel label="Mode" value={form.offlineFeeMode} onChange={up("offlineFeeMode")} opts={[{v:"percent",l:"% of transaction"},{v:"flat",l:"Flat "+cur}]}/>{form.offlineFeeMode==="percent"?<Inp label="%" value={form.offlineFeePercent} onChange={up("offlineFeePercent")} ph="3"/>:<Inp label={cur} value={form.offlineFeeFlat} onChange={up("offlineFeeFlat")} ph={String(pr.online)}/>}</div>}
        </div>
        <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><b style={{fontSize:13}}>Admin & Maintenance (Monthly)</b><Waive on={form.wAdmin} set={up("wAdmin")}/></div>
          {!form.wAdmin&&<Inp label="" value={form.adminFee} onChange={up("adminFee")} ph={String(pr.admin)}/>}
        </div>
        <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><Chk label="Implementation" value={form.implEnabled} onChange={up("implEnabled")}/><Waive on={form.wImpl} set={up("wImpl")}/></div>
          {form.implEnabled&&!form.wImpl&&<Inp label="" value={form.implFee} onChange={up("implFee")} ph={String(pr.impl)}/>}
        </div>
        <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><Chk label="SMS Notification" value={form.smsEnabled} onChange={up("smsEnabled")}/><Waive on={form.wSms} set={up("wSms")}/></div>
          {form.smsEnabled&&!form.wSms&&<Inp label="" value={form.smsFee} onChange={up("smsFee")} ph={String(pr.sms)}/>}
        </div>
      </div>

      <div style={ui.card}><div style={ui.ct}><span>✍️ Customer Signatory</span></div>
        <div style={ui.g2}>
          <Inp label="Name *" value={form.custSignName} onChange={up("custSignName")}/>
          <Inp label="Title" value={form.custSignTitle} onChange={up("custSignTitle")}/>
          <Inp label="Email" value={form.custSignEmail} onChange={up("custSignEmail")} type="email"/>
          <Inp label="Phone" value={form.custSignPhone} onChange={up("custSignPhone")}/>
          <Inp label="Billing Contact" value={form.billingContact} onChange={up("billingContact")}/>
          <Inp label="Billing Email" value={form.billingEmail} onChange={up("billingEmail")} type="email"/>
        </div>
      </div>

      <div style={{textAlign:"center",marginTop:32}}>
        <button style={{...ui.btn,...ui.pri}} onClick={()=>setView("preview")}>Preview Contract →</button>
      </div>
    </div></div>
  );
}
