import { useState } from "react";
const LOGO = "data:image/png;base64,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";

const Lg=({w=150})=><img src={LOGO} alt="seatOS" style={{width:w,height:"auto"}}/>;

/* ═══ DEFAULT PRICING (editable in Settings) ═══ */
const DEF_PRICING={
  THB:{online:10,admin:1600,impl:5200,sms:3,pos:500,kiosk:4000,name:"Thai Baht"},
  USD:{online:0.3,admin:60,impl:150,sms:0.08,pos:16,kiosk:130,name:"US Dollar"},
  PHP:{online:18,admin:2850,impl:8700,sms:5,pos:1000,kiosk:7300,name:"Philippine Peso"},
  IDR:{online:5000,admin:830000,impl:2540700,sms:1356,pos:271000,kiosk:170000000,name:"Indonesian Rupiah"},
  VND:{online:7900,admin:1300000,impl:3900000,sms:2000,pos:420000,kiosk:3210000,name:"Vietnamese Dong"},
};
const DEF_COMPANY={name:"BOOKAWAY LTD.",signName:"Liam Hutchinson",signTitle:"General Manager (SeatOS)",address:"6 HaTa'as St., Ramat Gan, 5251247",email:"chris@seatos.com",phone:"092 845 1000",billingContact:"Chris Medhanakula",billingEmail:"chris@seatos.com",billingPhone:"0928451000"};
const CURRENCIES=["THB","USD","PHP","IDR","VND"];
const COUNTRIES=["Thailand","Indonesia","Philippines","Vietnam","Singapore","Malaysia","Cambodia","Myanmar","Laos","India","Japan","South Korea","Taiwan","Hong Kong","China","Australia","New Zealand","United States","United Kingdom","Germany","France","Netherlands","Israel","United Arab Emirates","Saudi Arabia","Brazil","Mexico","Colombia","Peru","Chile","Argentina","South Africa","Nigeria","Kenya","Egypt","Turkey","Sri Lanka","Bangladesh","Nepal","Maldives"];
const TERMS=[{l:"1 Year",m:12},{l:"2 Years",m:24},{l:"3 Years",m:36},{l:"4 Years",m:48},{l:"5 Years",m:60}];
const TGO=["12Go (Thailand) Co., Ltd.","12Go Asia PTE. LTD."];
const fN=(n,c)=>{if(!n&&n!==0)return"";const d=["IDR","VND"].includes(c)?0:2;return Number(n).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d})};

/* ═══ UI ═══ */
const ui={app:{fontFamily:"'Segoe UI',Tahoma,sans-serif",background:"#F5F0EB",minHeight:"100vh"},wrap:{maxWidth:880,margin:"0 auto",padding:"32px 16px 80px"},card:{background:"#fff",borderRadius:16,padding:"24px 28px",marginBottom:20,boxShadow:"0 2px 12px rgba(0,0,0,.06)"},ct:{fontSize:15,fontWeight:700,color:"#E91E8C",marginBottom:14,display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"},g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14},g3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14},lb:{fontSize:11.5,fontWeight:600,color:"#555",marginBottom:3,display:"block"},inp:{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #ddd",fontSize:14,outline:"none",boxSizing:"border-box"},sel:{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #ddd",fontSize:14,outline:"none",boxSizing:"border-box",background:"#fff",cursor:"pointer"},full:{gridColumn:"1/-1"},btn:{padding:"14px 36px",borderRadius:12,border:"none",fontWeight:700,fontSize:16,cursor:"pointer"},pri:{background:"linear-gradient(135deg,#E8850C,#E91E8C)",color:"#fff",boxShadow:"0 4px 20px rgba(232,133,12,.35)"},sec2:{background:"#fff",color:"#E8850C",border:"2px solid #E8850C"},badge:{display:"inline-block",background:"#FFF3E0",color:"#E8850C",fontWeight:700,padding:"3px 12px",borderRadius:8,fontSize:12}};
const pg={page:{width:794,background:"#fff",padding:"48px 56px 40px",boxSizing:"border-box",position:"relative",pageBreakAfter:"always",marginBottom:24,boxShadow:"0 2px 16px rgba(0,0,0,.1)",fontFamily:"Arial,Helvetica,sans-serif",fontSize:10,lineHeight:1.5,color:"#222"},hr:{height:2,background:"#000",margin:"4px 0 8px"},title:{fontSize:13,fontWeight:700,textAlign:"center",margin:"12px 0 8px"},secTitle:{fontSize:11,fontWeight:700,textDecoration:"underline",margin:"14px 0 6px"},tbl:{width:"100%",borderCollapse:"collapse",fontSize:9.5,marginBottom:8},thDark:{background:"#333",color:"#fff",border:"1px solid #333",padding:"4px 6px",textAlign:"left",fontWeight:700,fontSize:9},th:{background:"#f5f5f5",border:"1px solid #ccc",padding:"4px 6px",textAlign:"left",fontWeight:700,fontSize:9},td:{border:"1px solid #ccc",padding:"4px 6px",fontSize:9.5,verticalAlign:"top"},tdB:{border:"1px solid #ccc",padding:"4px 6px",fontSize:9.5,verticalAlign:"top",fontWeight:700},ft:{display:"flex",justifyContent:"space-between",fontSize:8,color:"#999",borderTop:"1px solid #eee",paddingTop:6,marginTop:16},init:{textAlign:"right",fontSize:8.5,color:"#555",marginTop:12}};

/* Components */
const Inp=({label,value,onChange,type="text",ph="",style={},disabled=false})=>(<div style={style}><label style={ui.lb}>{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} disabled={disabled} style={{...ui.inp,...(disabled?{background:"#f5f5f5",color:"#999"}:{})}} onFocus={e=>{if(!disabled)e.target.style.borderColor="#E8850C"}} onBlur={e=>{e.target.style.borderColor="#ddd"}}/></div>);
const Sel=({label,value,onChange,opts,style={}})=>(<div style={style}><label style={ui.lb}>{label}</label><select value={value} onChange={e=>onChange(e.target.value)} style={ui.sel}>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>);
const Tog=({label,value,onChange})=>(<div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,fontWeight:600,color:"#555"}} onClick={()=>onChange(!value)}><div style={{width:44,height:24,borderRadius:12,background:value?"#E8850C":"#ccc",position:"relative",flexShrink:0}}><div style={{width:20,height:20,borderRadius:10,background:"#fff",position:"absolute",top:2,left:value?22:2,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/></div><span>{label}</span></div>);
const Chk=({label,value,onChange})=>(<div style={{display:"flex",alignItems:"center",cursor:"pointer",gap:6}} onClick={()=>onChange(!value)}><span style={{width:20,height:20,borderRadius:4,border:value?"2px solid #E8850C":"2px solid #ddd",background:value?"#E8850C":"#fff",color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0}}>{value?"✓":""}</span><span style={{fontSize:14,color:"#555"}}>{label}</span></div>);
const Waive=({on,set})=>(<span style={{display:"inline-flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:11,color:on?"#e53935":"#aaa",fontWeight:600,marginLeft:8}} onClick={()=>set(!on)}><span style={{width:16,height:16,borderRadius:3,border:on?"2px solid #e53935":"2px solid #ccc",background:on?"#e53935":"#fff",color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0}}>{on?"✕":""}</span>Waive</span>);
const Ft=({label,n})=>(<><div style={pg.init}>Initial (SeatOS): ...............................................</div><div style={pg.ft}><span>{label}</span><span>Page {n}</span></div></>);

export default function App(){
  const[pricing,setPricing]=useState(JSON.parse(JSON.stringify(DEF_PRICING)));
  const[company,setCompany]=useState({...DEF_COMPANY});
  const[showSettings,setShowSettings]=useState(false);
  const[form,setForm]=useState({
    orderType:"regular",country:"Thailand",currency:"THB",customerName:"",address:"",contactEmail:"",custRegNum:"",
    subStartDate:new Date().toISOString().split("T")[0],termMonths:12,
    onlineFeeMode:"percent",onlineFeePercent:"3",onlineFeeFlat:"",
    offlineFeeMode:"percent",offlineFeePercent:"3",offlineFeeFlat:"",
    adminFee:"",implFee:"",smsFee:"",
    implEnabled:true,smsEnabled:true,
    wOnline:false,wOffline:false,wAdmin:false,wImpl:false,wSms:false,
    posQty:0,kioskQty:0,
    discount:"",taxes:"",offsetArrangements:"",
    custSignName:"",custSignTitle:"",custSignAddress:"",custSignEmail:"",custSignPhone:"",
    billingContact:"",billingEmail:"",billingPhone:"",
    specialTerm1:"In order to utilize the capacity of the Licensed Software, the Customer undertakes to process and manage offline and online all ticket bookings using the Licensed Software (seatOS), thereby improving inventory management and reducing poor customer experience caused by booking decline.",
    specialTerm2:"In the event that the Customer requests a new feature to be developed for the Licensed Software, the Customer agrees to process and manage all offline and online ticket bookings using the Licensed Software (seatOS) only.",
    includeAmendment:true,twelveGoEntity:TGO[0]
  });
  const[view,setView]=useState("form");
  const[downloading,setDownloading]=useState(false);
  const up=k=>v=>setForm(p=>({...p,[k]:v}));
  const cur=form.currency;const pr=pricing[cur];const isBundle=form.orderType==="bundle";

  const getConvDisplay=(mode,pct,flat)=>{
    if(mode==="percent")return(pct||"3")+"%";
    return fN(flat!==""?Number(flat):pr.online,cur);
  };
  const onD=form.wOnline?"Waived":getConvDisplay(form.onlineFeeMode,form.onlineFeePercent,form.onlineFeeFlat);
  const offD=form.wOffline?"Waived":getConvDisplay(form.offlineFeeMode,form.offlineFeePercent,form.offlineFeeFlat);
  const v_admin=form.wAdmin?0:(form.adminFee!==""?Number(form.adminFee):pr.admin);
  const v_impl=form.wImpl?0:(form.implEnabled?(form.implFee!==""?Number(form.implFee):pr.impl):0);
  const v_sms=form.wSms?0:(form.smsEnabled?(form.smsFee!==""?Number(form.smsFee):pr.sms):0);
  const hasHardware=form.posQty>0||form.kioskQty>0;
  const disc=form.discount!==""?Number(form.discount):0;
  const tax=form.taxes!==""?Number(form.taxes):0;
  const endDate=(()=>{if(!form.subStartDate)return"";const d=new Date(form.subStartDate);d.setMonth(d.getMonth()+form.termMonths);d.setDate(d.getDate()-1);return d.toISOString().split("T")[0]})();
  const bl=(v,fb="")=>v||fb;

  /* ═══ SETTINGS PANEL ═══ */
  if(showSettings){
    const upP=(c,k,v)=>setPricing(p=>{const n={...p};n[c]={...n[c],[k]:v};return n});
    const upC=(k,v)=>setCompany(p=>({...p,[k]:v}));
    return(
    <div style={ui.app}><div style={ui.wrap}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:800,color:"#E8850C"}}>⚙️ Settings</h1>
        <button style={{...ui.btn,...ui.pri,padding:"10px 24px",fontSize:14}} onClick={()=>setShowSettings(false)}>← Back to Builder</button>
      </div>

      <div style={ui.card}><div style={ui.ct}><span>🏢 Company (SeatOS) Details</span></div>
        <div style={ui.g2}>
          <Inp label="Company Name" value={company.name} onChange={v=>upC("name",v)}/>
          <Inp label="Signatory Name" value={company.signName} onChange={v=>upC("signName",v)}/>
          <Inp label="Title" value={company.signTitle} onChange={v=>upC("signTitle",v)}/>
          <Inp label="Address" value={company.address} onChange={v=>upC("address",v)}/>
          <Inp label="Email" value={company.email} onChange={v=>upC("email",v)}/>
          <Inp label="Phone" value={company.phone} onChange={v=>upC("phone",v)}/>
          <Inp label="Billing Contact" value={company.billingContact} onChange={v=>upC("billingContact",v)}/>
          <Inp label="Billing Email" value={company.billingEmail} onChange={v=>upC("billingEmail",v)}/>
          <Inp label="Billing Phone" value={company.billingPhone} onChange={v=>upC("billingPhone",v)}/>
        </div>
      </div>

      {CURRENCIES.map(c=>(
        <div key={c} style={ui.card}><div style={ui.ct}><span>💰 {c} — {pricing[c].name}</span></div>
          <div style={ui.g3}>
            <Inp label="Online Conv. Fee (per txn)" value={String(pricing[c].online)} onChange={v=>upP(c,"online",Number(v)||0)}/>
            <Inp label="Admin & Maint. (Monthly)" value={String(pricing[c].admin)} onChange={v=>upP(c,"admin",Number(v)||0)}/>
            <Inp label="Implementation (One-time)" value={String(pricing[c].impl)} onChange={v=>upP(c,"impl",Number(v)||0)}/>
            <Inp label="SMS (per msg)" value={String(pricing[c].sms)} onChange={v=>upP(c,"sms",Number(v)||0)}/>
            <Inp label="POS (Monthly per unit)" value={String(pricing[c].pos)} onChange={v=>upP(c,"pos",Number(v)||0)}/>
            <Inp label="Kiosk (Monthly per unit)" value={String(pricing[c].kiosk)} onChange={v=>upP(c,"kiosk",Number(v)||0)}/>
          </div>
        </div>
      ))}

      <button style={{...ui.btn,background:"#e53935",color:"#fff",width:"100%"}} onClick={()=>{setPricing(JSON.parse(JSON.stringify(DEF_PRICING)));setCompany({...DEF_COMPANY})}}>Reset to Defaults</button>
    </div></div>
  )}

  /* ═══ FORM ═══ */
  if(view==="form"){return(
    <div style={ui.app}><div style={ui.wrap}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <Lg w={180}/>
        <button style={{...ui.btn,...ui.sec2,padding:"8px 20px",fontSize:13}} onClick={()=>setShowSettings(true)}>⚙️ Settings</button>
      </div>
      <h1 style={{fontSize:28,fontWeight:800,color:"#E8850C",marginBottom:4}}>Contract Builder</h1>
      <p style={{fontSize:14,color:"#888",marginBottom:28}}>Generate a SeatOS Software Subscription &amp; Services Agreement.</p>

      {/* Order Type */}
      <div style={ui.card}><div style={ui.ct}><span>📋 Order Type</span></div>
        <div style={{display:"flex",gap:12}}>
          {["regular","bundle"].map(v=>(<button key={v} onClick={()=>up("orderType")(v)} style={{flex:1,padding:"14px",borderRadius:12,border:form.orderType===v?"2px solid #E8850C":"2px solid #eee",background:form.orderType===v?"#FFF8F0":"#fff",fontWeight:700,fontSize:15,cursor:"pointer",color:form.orderType===v?"#E8850C":"#999"}}>{v==="regular"?"📄 Regular":"📦 Bundle"}</button>))}
        </div>
      </div>

      {/* Country & Currency */}
      <div style={ui.card}><div style={ui.ct}><span>🌏 Country &amp; Currency</span></div>
        <div style={ui.g3}>
          <Sel label="Country *" value={form.country} onChange={up("country")} opts={COUNTRIES.map(c=>({v:c,l:c}))}/>
          <Sel label="Currency *" value={form.currency} onChange={up("currency")} opts={CURRENCIES.map(c=>({v:c,l:c+" — "+pricing[c].name}))}/>
          <div><label style={ui.lb}>Rate</label><div style={{padding:"10px 12px",background:"#FFF8F0",borderRadius:10,border:"1.5px solid #E8850C",fontWeight:700,color:"#E8850C",fontSize:14}}>{isBundle?"Bundle":"Regular"} ({cur})</div></div>
        </div>
      </div>

      {/* Company Info */}
      <div style={ui.card}><div style={ui.ct}><span>🏢 Company Information</span></div>
        <div style={ui.g2}>
          <Inp label="Customer Name *" value={form.customerName} onChange={up("customerName")} ph="e.g. Acme Travel Co., Ltd."/>
          <Inp label="Registration No." value={form.custRegNum} onChange={up("custRegNum")}/>
          <Inp label="State of Incorporation" value={form.country} onChange={()=>{}} disabled/>
          <Inp label="Contact Email *" value={form.contactEmail} onChange={up("contactEmail")} type="email"/>
          <Inp label="Address *" value={form.address} onChange={up("address")} style={ui.full} ph="Full company address"/>
        </div>
      </div>

      {/* Subscription */}
      <div style={ui.card}><div style={ui.ct}><span>📅 Subscription Term</span></div>
        <div style={ui.g3}>
          <Inp label="Start Date *" value={form.subStartDate} onChange={up("subStartDate")} type="date"/>
          <Sel label="Duration *" value={form.termMonths} onChange={v=>up("termMonths")(Number(v))} opts={TERMS.map(x=>({v:x.m,l:x.l}))}/>
          <Inp label="End Date (auto)" value={endDate} onChange={()=>{}} disabled/>
        </div>
      </div>

      {/* Fees */}
      <div style={ui.card}><div style={ui.ct}><span>💰 Licenses &amp; Fees</span><span style={ui.badge}>{cur}</span></div>
        {/* Online */}
        <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><b style={{fontSize:13}}>Online Convenience Fee</b><Waive on={form.wOnline} set={up("wOnline")}/></div>
          {!form.wOnline&&<div style={ui.g3}><Sel label="Mode" value={form.onlineFeeMode} onChange={up("onlineFeeMode")} opts={[{v:"percent",l:"% of transaction"},{v:"flat",l:"Flat "+cur}]}/>{form.onlineFeeMode==="percent"?<Inp label="%" value={form.onlineFeePercent} onChange={up("onlineFeePercent")} ph="3"/>:<Inp label={cur} value={form.onlineFeeFlat} onChange={up("onlineFeeFlat")} ph={String(pr.online)}/>}<div style={{fontSize:12,color:"#888",paddingTop:22}}>Ref: {fN(pr.online,cur)} {cur}/txn</div></div>}
        </div>
        {/* Offline */}
        <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><b style={{fontSize:13}}>Offline Convenience Fee</b><Waive on={form.wOffline} set={up("wOffline")}/></div>
          {!form.wOffline&&<div style={ui.g3}><Sel label="Mode" value={form.offlineFeeMode} onChange={up("offlineFeeMode")} opts={[{v:"percent",l:"% of transaction"},{v:"flat",l:"Flat "+cur}]}/>{form.offlineFeeMode==="percent"?<Inp label="%" value={form.offlineFeePercent} onChange={up("offlineFeePercent")} ph="3"/>:<Inp label={cur} value={form.offlineFeeFlat} onChange={up("offlineFeeFlat")} ph={String(pr.online)}/>}<div style={{fontSize:12,color:"#888",paddingTop:22}}>Ref: {fN(pr.online,cur)} {cur}/txn</div></div>}
        </div>
        {/* Admin */}
        <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><b style={{fontSize:13}}>Admin &amp; Maintenance (Monthly)</b><Waive on={form.wAdmin} set={up("wAdmin")}/></div>
          {!form.wAdmin&&<Inp label="" value={form.adminFee} onChange={up("adminFee")} ph={String(pr.admin)}/>}
          {form.wAdmin&&<div style={{padding:"8px 12px",borderRadius:10,background:"#fff0f0",border:"1.5px solid #e53935",color:"#e53935",fontSize:13,fontWeight:600}}>Waived</div>}
        </div>
        {/* Implementation */}
        <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><Chk label="Implementation & Configuration" value={form.implEnabled} onChange={up("implEnabled")}/><Waive on={form.wImpl} set={up("wImpl")}/></div>
          {form.implEnabled&&!form.wImpl&&<Inp label="" value={form.implFee} onChange={up("implFee")} ph={String(pr.impl)}/>}
          {form.wImpl&&<div style={{padding:"8px 12px",borderRadius:10,background:"#fff0f0",border:"1.5px solid #e53935",color:"#e53935",fontSize:13,fontWeight:600}}>Waived</div>}
        </div>
        {/* SMS */}
        <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><Chk label="SMS Notification" value={form.smsEnabled} onChange={up("smsEnabled")}/><Waive on={form.wSms} set={up("wSms")}/></div>
          {form.smsEnabled&&!form.wSms&&<Inp label="" value={form.smsFee} onChange={up("smsFee")} ph={String(pr.sms)}/>}
          {form.wSms&&<div style={{padding:"8px 12px",borderRadius:10,background:"#fff0f0",border:"1.5px solid #e53935",color:"#e53935",fontSize:13,fontWeight:600}}>Waived</div>}
        </div>
      </div>

      {/* Hardware */}
      <div style={ui.card}><div style={ui.ct}><span>🖥️ Hardware</span></div>
        <p style={{fontSize:12,color:"#888",marginBottom:12}}>Set quantity to 0 to exclude from the contract.</p>
        <div style={ui.g2}>
          <div><label style={ui.lb}>POS Quantity (@ {fN(pr.pos,cur)} {cur}/unit/month)</label><input type="number" min="0" value={form.posQty} onChange={e=>up("posQty")(Math.max(0,Number(e.target.value)))} style={ui.inp}/></div>
          <div><label style={ui.lb}>Kiosk Quantity (@ {fN(pr.kiosk,cur)} {cur}/unit/month)</label><input type="number" min="0" value={form.kioskQty} onChange={e=>up("kioskQty")(Math.max(0,Number(e.target.value)))} style={ui.inp}/></div>
        </div>
      </div>

      {/* Summary */}
      <div style={ui.card}><div style={ui.ct}><span>📊 Summary</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"6px 20px",fontSize:14,marginBottom:12}}>
          <span style={{color:"#555"}}>Online Conv.</span><span style={{fontWeight:600,textAlign:"right"}}>{onD}{form.onlineFeeMode==="flat"&&!form.wOnline?" "+cur:""}</span>
          <span style={{color:"#555"}}>Offline Conv.</span><span style={{fontWeight:600,textAlign:"right"}}>{offD}{form.offlineFeeMode==="flat"&&!form.wOffline?" "+cur:""}</span>
          <span style={{color:"#555"}}>Admin (Monthly)</span><span style={{fontWeight:600,textAlign:"right"}}>{form.wAdmin?"Waived":fN(v_admin,cur)+" "+cur}</span>
          <span style={{color:"#555"}}>Implementation</span><span style={{fontWeight:600,textAlign:"right"}}>{form.wImpl?"Waived":(!form.implEnabled?"N/A":fN(v_impl,cur)+" "+cur)}</span>
          <span style={{color:"#555"}}>SMS</span><span style={{fontWeight:600,textAlign:"right"}}>{form.wSms?"Waived":(!form.smsEnabled?"N/A":fN(v_sms,cur)+" "+cur)}</span>
          {form.posQty>0&&<><span style={{color:"#555"}}>POS ×{form.posQty}</span><span style={{fontWeight:600,textAlign:"right"}}>{fN(form.posQty*pr.pos,cur)} {cur}/mo</span></>}
          {form.kioskQty>0&&<><span style={{color:"#555"}}>Kiosk ×{form.kioskQty}</span><span style={{fontWeight:600,textAlign:"right"}}>{fN(form.kioskQty*pr.kiosk,cur)} {cur}/mo</span></>}
        </div>
        <div style={ui.g2}><Inp label="Discount" value={form.discount} onChange={up("discount")} ph="0"/><Inp label="Taxes" value={form.taxes} onChange={up("taxes")} ph="0"/></div>
        <p style={{fontSize:12,color:"#888",marginTop:8,fontStyle:"italic"}}>* Convenience fees are usage-based. No fixed grand total.</p>
        <Inp label="Offset Arrangements" value={form.offsetArrangements} onChange={up("offsetArrangements")} style={{marginTop:12}} ph="Offset arrangements…"/>
      </div>

      {/* Signatory */}
      <div style={ui.card}><div style={ui.ct}><span>✍️ Customer Signatory &amp; Billing</span></div>
        <div style={ui.g2}>
          <Inp label="Name *" value={form.custSignName} onChange={up("custSignName")}/>
          <Inp label="Title" value={form.custSignTitle} onChange={up("custSignTitle")}/>
          <Inp label="Address" value={form.custSignAddress} onChange={up("custSignAddress")}/>
          <Inp label="Email" value={form.custSignEmail} onChange={up("custSignEmail")} type="email"/>
          <Inp label="Phone" value={form.custSignPhone} onChange={up("custSignPhone")}/>
          <Inp label="Billing Contact" value={form.billingContact} onChange={up("billingContact")}/>
          <Inp label="Billing Email" value={form.billingEmail} onChange={up("billingEmail")} type="email"/>
          <Inp label="Billing Phone" value={form.billingPhone} onChange={up("billingPhone")}/>
        </div>
      </div>

      {/* Special Terms */}
      <div style={ui.card}><div style={ui.ct}><span>📝 Special Terms</span></div>
        <Inp label="Term 1" value={form.specialTerm1} onChange={up("specialTerm1")} style={{marginBottom:12}}/>
        <Inp label="Term 2" value={form.specialTerm2} onChange={up("specialTerm2")}/>
      </div>

      {isBundle&&<div style={ui.card}><div style={ui.ct}><span>📦 Bundle: 12GO</span></div><Sel label="12GO Entity" value={form.twelveGoEntity} onChange={up("twelveGoEntity")} opts={TGO.map(e=>({v:e,l:e}))}/></div>}

      <div style={ui.card}><div style={ui.ct}><span>⚙️ Options</span></div>
        <Tog label="Include Amendment page" value={form.includeAmendment} onChange={up("includeAmendment")}/>
      </div>

      <div style={{textAlign:"center",marginTop:32}}>
        <button style={{...ui.btn,...ui.pri}} onClick={()=>setView("preview")}>Preview Contract →</button>
      </div>
    </div></div>
  )}

  /* ═══ PREVIEW ═══ */
  const f=form;const co=company;const curL=cur+" "+pr.name;
  let pn=0;const pgN=()=>++pn;

  const handleDownload=async()=>{
    setDownloading(true);
    try{
      /* Load html2pdf.js if not loaded */
      if(!window.html2pdf){
        await new Promise((res,rej)=>{
          const s=document.createElement('script');
          s.src='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
          s.onload=res;s.onerror=rej;document.head.appendChild(s);
        });
      }
      const el=document.getElementById('contract-pages');
      if(!el){setDownloading(false);return;}
      const name=f.customerName||'Contract';
      const fn=`SeatOS_${name.replace(/[^a-zA-Z0-9]/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`;
      await window.html2pdf(el,{
        margin:[0,0,0,0],
        filename:fn,
        image:{type:'jpeg',quality:0.95},
        html2canvas:{scale:2,useCORS:true,scrollY:0,windowWidth:794},
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
        pagebreak:{mode:['css'],before:'.a4'}
      });
    }catch(e){
      console.error('PDF error:',e);
      try{window.print()}catch(e2){alert('PDF download failed. Please use Ctrl+P / Cmd+P to print.')}
    }
    setDownloading(false);
  };

  return(
    <div style={ui.app}>
      <style>{`@media print{body,html{margin:0;padding:0;background:#fff!important}.no-print{display:none!important}.a4{box-shadow:none!important;margin:0!important;page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact}.a4:last-child{page-break-after:auto}@page{size:A4;margin:0}}`}</style>
      <div className="no-print" style={{position:"sticky",top:0,zIndex:100,background:"rgba(245,240,235,.95)",backdropFilter:"blur(8px)",padding:"12px 24px",display:"flex",justifyContent:"center",gap:16,borderBottom:"1px solid #e0d8d0"}}>
        <button style={{...ui.btn,...ui.sec2,padding:"10px 24px",fontSize:14}} onClick={()=>setView("form")}>← Back to Edit</button>
        <button style={{...ui.btn,...ui.pri,padding:"10px 24px",fontSize:14,opacity:downloading?0.6:1}} onClick={handleDownload} disabled={downloading}>{downloading?"Generating PDF...":"Download PDF"}</button>
      </div>
      <div id="contract-pages" style={{maxWidth:840,margin:"24px auto",padding:"0 16px 80px"}}>

{/* PAGE 1 */}
<div className="a4" style={pg.page}>
<Lg w={150}/><div style={pg.hr}/>
<div style={pg.title}>SEATOS SOFTWARE SUBSCRIPTION AND SERVICES AGREEMENT ORDER</div>
<p style={{fontSize:9,marginBottom:10,textAlign:"justify"}}>This SEATOS SOFTWARE SUBSCRIPTION AND SERVICES AGREEMENT ORDER ("<b>Order</b>") is entered into by and between seatOS, operated by Bookaway Ltd. ("<b>Company</b>") and the entity named in the signature block below ("<b>Customer</b>"). This Order is subject to and governed by the Software Subscription and Services Agreement attached herein (the "<b>Agreement</b>"), (each a "<b>Party</b>", collectively the "<b>Parties</b>"). By signing this Order, Customer represents that it has read and understood the Agreement and each party acknowledges and agrees that the Agreement is incorporated by reference into this Order. All terms not defined herein shall have the meaning set forth in the Agreement.</p>
<div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>CUSTOMER INFORMATION</div>
<table style={pg.tbl}><tbody>
<tr><td style={{...pg.tdB,width:"30%"}}>Customer Name</td><td style={pg.td}>{bl(f.customerName)}</td></tr>
<tr><td style={pg.tdB}>State of Incorporation</td><td style={pg.td}>{f.country}</td></tr>
<tr><td style={pg.tdB}>Address</td><td style={pg.td}>{bl(f.address)}</td></tr>
<tr><td style={pg.tdB}>Contact Email</td><td style={pg.td}>{bl(f.contactEmail)}</td></tr>
<tr><td style={pg.tdB}>Licensed Software</td><td style={pg.td}>SeatOS TMS</td></tr>
</tbody></table>
<div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>SUBSCRIPTION TERM</div>
<table style={pg.tbl}><tbody>
<tr><td style={{...pg.tdB,width:"25%"}}>Subscription Term</td><td style={{...pg.tdB,width:"15%"}}>Start Date</td><td style={pg.td}>{bl(f.subStartDate)}</td><td style={{...pg.tdB,width:"15%"}}>End Date</td><td style={pg.td}>{bl(endDate)}</td></tr>
<tr><td style={pg.tdB}>Renewal</td><td colSpan={4} style={{...pg.td,fontSize:9}}>The Subscription Term begins on the Start Date and continues to the End Date and will automatically renew for additional 12 months periods (the "<b>Subscription Term</b>") until either party notifies the other that this Order will not renew, at least thirty (30) days prior to the expiration of the then current Subscription Term.</td></tr>
</tbody></table>
<div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>LICENSES</div>
<table style={pg.tbl}>
<thead><tr><th style={pg.th}>Type</th><th style={{...pg.th,width:80}}>Invoicing</th><th style={{...pg.th,width:100}}>Fees ({cur})</th></tr></thead>
<tbody>
<tr><td style={pg.td}>Online Convenience Fee</td><td style={pg.td}>Monthly</td><td style={{...pg.td,textAlign:"right"}}>{onD}</td></tr>
<tr><td style={pg.td}>Offline Convenience Fee</td><td style={pg.td}>Monthly</td><td style={{...pg.td,textAlign:"right"}}>{offD}</td></tr>
<tr><td style={pg.td}>Monthly Administration and Maintenance Fee</td><td style={pg.td}>Monthly</td><td style={{...pg.td,textAlign:"right"}}>{form.wAdmin?"Waived":fN(v_admin,cur)}</td></tr>
</tbody></table>
<div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>SERVICES</div>
<table style={pg.tbl}>
<thead><tr><th style={pg.th}>Type</th><th style={{...pg.th,width:36}}>YES</th><th style={{...pg.th,width:36}}>NO</th><th style={{...pg.th,width:100}}>Invoicing</th><th style={{...pg.th,width:80}}>Fees ({cur})</th></tr></thead>
<tbody>
<tr><td style={pg.td}>Hosting</td><td colSpan={2} style={{...pg.td,fontSize:8.5}}>Included in Admin Fee</td><td style={pg.td}>Monthly</td><td style={pg.td}></td></tr>
<tr><td style={pg.td}>Implementation and Configuration</td><td style={{...pg.td,textAlign:"center"}}>{f.implEnabled&&!f.wImpl?"✓":""}</td><td style={{...pg.td,textAlign:"center"}}>{!f.implEnabled||f.wImpl?"✓":""}</td><td style={pg.td}>One-time</td><td style={{...pg.td,textAlign:"right"}}>{f.wImpl?"Waived":(!f.implEnabled?"—":fN(v_impl,cur))}</td></tr>
<tr><td style={pg.td}>Help Desk Support</td><td colSpan={2} style={{...pg.td,fontSize:8.5}}>Included in Admin Fee</td><td style={pg.td}></td><td style={pg.td}></td></tr>
</tbody></table>

{/* Hardware — only if ordered */}
{hasHardware&&(<><div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>HARDWARE</div>
<table style={pg.tbl}>
<thead><tr><th style={pg.th}>Quantity</th><th style={pg.th}>Type</th><th style={{...pg.th,width:80}}>Invoicing</th><th style={{...pg.th,width:140}}>Fees</th></tr></thead>
<tbody>
{f.posQty>0&&<tr><td style={{...pg.td,textAlign:"center"}}>{f.posQty}</td><td style={pg.td}>POS</td><td style={pg.td}>Monthly</td><td style={pg.td}>{fN(pr.pos,cur)} {cur} per each POS</td></tr>}
{f.kioskQty>0&&<tr><td style={{...pg.td,textAlign:"center"}}>{f.kioskQty}</td><td style={pg.td}>Kiosk</td><td style={pg.td}>Monthly</td><td style={pg.td}>{fN(pr.kiosk,cur)} {cur} per each Kiosk</td></tr>}
</tbody></table></>)}

<div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>ANCILLARY CHARGES</div>
<table style={pg.tbl}>
<thead><tr><th style={pg.th}>Type</th><th style={{...pg.th,width:36}}>YES</th><th style={{...pg.th,width:36}}>NO</th><th style={{...pg.th,width:100}}>Invoicing</th><th style={{...pg.th,width:80}}>Fees ({cur})</th></tr></thead>
<tbody><tr><td style={pg.td}>SMS notification</td><td style={{...pg.td,textAlign:"center"}}>{f.smsEnabled&&!f.wSms?"✓":""}</td><td style={{...pg.td,textAlign:"center"}}>{!f.smsEnabled||f.wSms?"✓":""}</td><td style={pg.td}>Monthly</td><td style={{...pg.td,textAlign:"right"}}>{f.wSms?"Waived":(!f.smsEnabled?"—":fN(v_sms,cur))}</td></tr></tbody>
</table>
<div style={{fontWeight:700,fontSize:10,margin:"10px 0 4px"}}>FEES SUMMARY</div>
<table style={pg.tbl}>
<thead><tr><th style={pg.thDark}></th><th style={pg.thDark}></th></tr></thead>
<tbody>
<tr><td style={pg.td}>Convenience Fee (Online)</td><td style={{...pg.td,textAlign:"right"}}>{onD}</td></tr>
<tr><td style={pg.td}>Convenience Fee (Offline)</td><td style={{...pg.td,textAlign:"right"}}>{offD}</td></tr>
<tr><td style={pg.tdB}>Total for One-Time Payments</td><td style={{...pg.td,textAlign:"right",fontWeight:700}}>{fN(v_impl,cur)}</td></tr>
<tr><td style={pg.tdB}>Total for Monthly Payments</td><td style={{...pg.td,textAlign:"right",fontWeight:700}}>{fN(v_admin+v_sms+(f.posQty*pr.pos)+(f.kioskQty*pr.kiosk),cur)}</td></tr>
</tbody></table>
<Ft label="SeatOS – Order Form" n={pgN()}/>
</div>

{/* PAGE 2 */}
<div className="a4" style={pg.page}>
<Lg w={150}/><div style={pg.hr}/>
<table style={{...pg.tbl,marginTop:4}}><tbody>
<tr><td style={pg.td}>Discount</td><td style={{...pg.td,textAlign:"right",width:"40%"}}>{fN(disc,cur)}</td></tr>
<tr><td style={pg.td}>Taxes</td><td style={{...pg.td,textAlign:"right"}}>{fN(tax,cur)}</td></tr>
</tbody></table>
{isBundle?(<p style={{fontSize:8.5,fontStyle:"italic",margin:"8px 0",textAlign:"justify"}}><i>Currency: Fees in this Order are calculated in <b>{curL}</b>. The discounts contained in the fee table(s) above are valid for this Order only and may not be carried over to any future amendments or orders, which will be, unless otherwise agreed, at the applicable list price. For the avoidance of doubt, such discounted pricing shall remain applicable throughout the entire Subscription Term, including the Initial Term and any automatic renewal periods, unless otherwise expressly agreed in writing by both parties.</i></p>):(<p style={{fontSize:8.5,fontStyle:"italic",margin:"8px 0",textAlign:"justify"}}><i>Currency: Fees in this Order are calculated in <b>{curL}</b>. The discounts contained in the fee table(s) above are valid for this Order only and may not be carried over to any future amendments or orders, which will be, unless otherwise agreed, at the applicable list price.</i></p>)}
<p style={{fontSize:9,margin:"6px 0",textAlign:"justify"}}><b>Off Set:</b> The Company will be entitled to offset any amounts due to it (under any agreement) against any amount payable to the Customer under this Agreement.</p>
<p style={{fontSize:9,margin:"6px 0",textAlign:"justify"}}><b>Offset Arrangements:</b> {f.offsetArrangements||"The Company reserves the right to offset any amounts due to it (under any agreement) against any amounts payable to the Customer under this Agreement. Furthermore, this Agreement provides the Company the option to specifically offset payments received from Customer's subscription services against any due payments to the Company and its affiliates, as part of the settlement process."}</p>
{isBundle&&(<div style={{margin:"10px 0"}}><p style={{fontSize:9,textAlign:"justify",marginBottom:6}}><b>12GO Borne Fees:</b> Notwithstanding anything to the contrary in this Order, all fees shall be borne by {f.twelveGoEntity} ("12GO"), an affiliate of the Company (the "12GO Borne Fees"), for as long as the Travel Supply Services Supplier Agreement, attached to this Order as Schedule D (the "Travel Supplier Services Agreement"), remains in full force and effect.</p><p style={{fontSize:9,textAlign:"justify",marginBottom:6}}>Upon expiration or termination of the Travel Supplier Services Agreement for any reason, 12GO shall no longer bear the 12GO Borne Fees, and the Customer shall be responsible for paying the applicable fees specified in this Order from the effective date of such termination or expiration.</p><p style={{fontSize:9,textAlign:"justify"}}>In the event of any conflict between this Order and the Special Deal Agreement terms and conditions, the terms and conditions of this Order shall prevail with respect to this Order.</p></div>)}
<div style={{fontWeight:700,fontSize:10,margin:"12px 0 4px"}}>SPECIAL TERMS</div>
<table style={pg.tbl}><tbody><tr><td style={{...pg.tdB,width:"22%",fontStyle:"italic",verticalAlign:"top"}}>Special Terms</td><td style={{...pg.td,fontSize:9}}><p style={{margin:"0 0 6px"}}>• {f.specialTerm1}</p><p style={{margin:0}}>• {f.specialTerm2}</p></td></tr></tbody></table>
<div style={{border:"2px solid #000",borderLeft:"none",borderRight:"none",padding:"8px 12px",margin:"12px 0",textAlign:"center"}}><b style={{fontSize:8.5,textTransform:"uppercase"}}>EACH PARTY EXECUTING THIS ORDER REPRESENTS THAT, ON THE DATE SET FORTH BELOW (THE "EFFECTIVE DATE"), SUCH PARTY'S AUTHORIZED REPRESENTATIVE HAS READ, UNDERSTANDS, AND AGREES TO BE BOUND BY THIS THE TERMS OF THIS ORDER</b></div>

{/* SIGNATURES — 50/50 split */}
<table style={{...pg.tbl,fontSize:9,tableLayout:"fixed"}}>
<colgroup><col style={{width:"18%"}}/><col style={{width:"32%"}}/><col style={{width:"18%"}}/><col style={{width:"32%"}}/></colgroup>
<thead><tr><th style={pg.thDark} colSpan={2}>SIGNATURES</th><th style={pg.thDark} colSpan={2}></th></tr></thead>
<tbody>
<tr><td style={pg.tdB}>Customer Name:</td><td style={pg.td}>{bl(f.customerName)}</td><td style={pg.tdB}>Company:</td><td style={pg.td}>{co.name}</td></tr>
<tr><td style={pg.tdB}>Customer Reg. No.:</td><td style={pg.td}>{bl(f.custRegNum)}</td><td style={pg.td}></td><td style={pg.td}></td></tr>
<tr><td style={pg.td}>Signature:</td><td style={{...pg.td,height:70}}></td><td style={pg.tdB}>Signature:</td><td style={{...pg.td,height:70}}></td></tr>
<tr><td style={pg.td}>Name:</td><td style={pg.td}>{bl(f.custSignName)}</td><td style={pg.tdB}>Name:</td><td style={pg.td}>{co.signName}</td></tr>
<tr><td style={pg.td}>Title:</td><td style={pg.td}>{bl(f.custSignTitle)}</td><td style={pg.tdB}>Title:</td><td style={pg.td}>{co.signTitle}</td></tr>
<tr><td style={pg.td}>Address:</td><td style={pg.td}>{bl(f.custSignAddress)}</td><td style={pg.tdB}>Address:</td><td style={pg.td}>{co.address}</td></tr>
<tr><td style={pg.td}>Email:</td><td style={pg.td}>{bl(f.custSignEmail)}</td><td style={pg.tdB}>Email:</td><td style={pg.td}>{co.email}</td></tr>
<tr><td style={pg.td}>Phone:</td><td style={pg.td}>{bl(f.custSignPhone)}</td><td style={pg.tdB}>Phone:</td><td style={pg.td}>{co.phone}</td></tr>
<tr><td style={pg.td}>Billing Contact:</td><td style={pg.td}>{bl(f.billingContact)}</td><td style={pg.tdB}>Billing Contact:</td><td style={pg.td}>{co.billingContact}</td></tr>
<tr><td style={pg.td}>Billing Email:</td><td style={pg.td}>{bl(f.billingEmail)}</td><td style={pg.tdB}>Billing Email:</td><td style={pg.td}>{co.billingEmail}</td></tr>
<tr><td style={pg.td}>Billing Phone:</td><td style={pg.td}>{bl(f.billingPhone)}</td><td style={pg.tdB}>Billing Phone:</td><td style={pg.td}>{co.billingPhone}</td></tr>
</tbody></table>
<Ft label="SeatOS – Order Form" n={pgN()}/>
</div>

{/* AGREEMENT PAGES — full text from PDF */}
<div className="a4" style={pg.page}><Lg w={150}/><div style={pg.hr}/><div style={{...pg.title,fontSize:14,margin:"16px 0 10px"}}>SOFTWARE SUBSCRIPTION &amp; SERVICES AGREEMENT</div><p style={{fontSize:9,marginBottom:6,textAlign:"justify"}}>This Software Subscription and Services Agreement (collectively with any documents incorporated by reference, the "<b>Agreement</b>") is by and between <b>SeatOS</b>, operated by Bookaway Ltd., a company incorporated under the laws of the state of Israel ("<b>Company</b>") and the entity identified in the applicable Order ("<b>Customer</b>"). (Each a "<b>party</b>" and collectively, the "<b>parties</b>").</p><p style={{fontSize:8.5,fontWeight:700,marginBottom:8,textAlign:"justify"}}>IF CUSTOMER SIGNS UP FOR SUBSCRIPTION, EITHER THROUGH THE WEB SITE OR BY SIGNING AN ORDER, CUSTOMER REPRESENTS THAT IT HAS THE POWER AND AUTHORITY TO ENTER INTO THIS AGREEMENT AND THAT IT HAS READ, UNDERSTANDS AND AGREES TO BE BOUND BY THE FOLLOWING TERMS AND CONDITIONS:</p><div style={pg.secTitle}>1. Subscription and Services</div><p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>1.1. Subject to the terms of this Agreement, Customer may use or receive the Company's software (and services that Customer selects in order forms (each an "Order") executed by both parties or, if available, entered into by Customer on-line through Company's website. "Subscription" means Customer's and its Permitted Users' access and usage rights to the Licensed Software (defined below) by and on behalf of Company, which shall include Support as set forth in the applicable Order. "Services" means those services or trainings that are agreed upon and set forth in the applicable Order. For purposes of this Agreement, "Permitted User" means Customer's employees, agents and contractors authorized by Customer to access and use the Licensed Software.</p><p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>1.2. "Licensed Software" means Company proprietary software as set forth in the Order, as well as the Documentation and other materials which may be furnished to Customer by Company in printed or electronic format that are pertinent to the use of the Subscription. "Documentation" means the manuals, specifications, and other materials describing the functionality, features, and operating characteristics of the Licensed Software that Company makes available to the Customer, as well as any updates thereto.</p><p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>1.3. License Grant. Subject to Customer's payment of Subscription Fees and its compliance with all the terms and conditions of this Agreement, Company hereby grants Customer a non-exclusive, non-sublicensable, and non-transferable limited license during the Subscription Term to: (i) use the Licensed Software as hosted by Company solely for Customer's internal business purposes; and (ii) use and make a reasonable number of copies of the Documentation solely for Customer's internal business purposes in connection with Customer's use of the Licensed Software. Customer right to access and use the Licensed Software is limited to the number of licenses purchased by Customer in accordance with the Order.</p><p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>1.4. Use Restrictions. Customer shall not use the Licensed Software or Documentation for any purposes beyond the scope of the license granted in this Agreement. Customer shall not at any time, directly or indirectly: (i) copy, reproduce, modify, or create derivative works; (ii) rent, lease, lend, sell, sublicense, assign, distribute, publish, transfer, or otherwise make available the Licensed Software; (iii) reverse engineer, disassemble, decompile, decode, or otherwise attempt to derive or gain access to the source code; (iv) remove any proprietary notices; or (v) use the Licensed Software in any manner that infringes any intellectual property right or violates any applicable law.</p><p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>1.5. Reservation of Rights. Company reserves all rights not expressly granted to Customer in this Agreement.</p><p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>1.6. Delivery and Setup. Company shall deliver the Licensed Software electronically to Customer following the Effective Date, upon implementation, setup and configuration ("Setup Services").</p><p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>1.7. Support and Maintenance. Company shall provide Customer with standard technical support and maintenance services ("Support") at no additional charge, unless otherwise set forth in the Order.</p><div style={pg.secTitle}>2. Obligations of the Parties</div><p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>2.1. Compliance with Laws. Each party will, at its own expense: (a) remain compliant with all laws and government regulations applicable to this Agreement (including privacy laws), and (b) reasonably cooperate with the other party.</p><p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>2.2. Customer Responsibilities. Customer shall (a) be responsible for Permitted Users' compliance with this Agreement, (b) be responsible for the accuracy, quality, integrity, and legality of Customer Data, (c) use commercially reasonable efforts to prevent unauthorized access to or use of the Licensed Software, (d) use the Licensed Software only in accordance with the Documentation and applicable laws, and (e) provide Company with assistance and information reasonably requested.</p><p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>2.3. Security. Company has implemented industry standard technical and organizational measures designed to secure the Licensed Software and Customer Data from accidental loss and unauthorized access, use, alteration or disclosure.</p><Ft label="SeatOS – Software Subscription & Services Agreement" n={pgN()}/></div>

<div className="a4" style={pg.page}><Lg w={150}/><div style={pg.hr}/><div style={pg.secTitle}>3. Payment</div>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>3.1. Fees. Customer agrees to pay Company the fees ("Subscription Fees") and other amounts set forth on all applicable Orders. Except as otherwise specified in an Order, (a) Subscription Fees are based on Subscription(s) purchased and not actual usage, and (b) payment obligations are non-cancellable, and Fees paid are non-refundable. Company reserves the right to change the pricing of the Subscription Fees prior to the automatic renewal of an Order. Company will notify Customer of such pricing changes at least thirty (30) days prior to the expiration of the then current Subscription Term.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>3.2. Payment Terms. Unless otherwise specified in the applicable Order, all undisputed fees and other amounts due under this Agreement shall be due payable net thirty (30) calendar days after date of invoice. Company may charge a late charge equal to the lesser of (a) one percent (1%) per month or (b) the maximum amount allowed by applicable law, on any outstanding past due balance that is not the subject of a good faith dispute. Customer will provide complete and accurate billing and contact information to Company and promptly notify Company of any changes to such information.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>3.3. Offset. The Customer hereby acknowledges and agrees that the Company shall have the right to offset any outstanding amounts or balances owed by the Customer to the Company against any amounts payable by the Company directly, or by its direct or indirect subsidiaries or any other affiliate, controlling, controlled by or under common control with the Company, whether such amounts arise under contract or pursuant to applicable law. The Company may exercise this right at any time, in its sole discretion, without the need for prior consent or notification to the Customer to effectuate such offset. The Customer further agrees to cooperate with the Company, including providing or executing any necessary documents, to evidence such offset.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>3.4. Taxes. Fees stated in the Orders do not include applicable taxes. Customer shall be responsible for, all taxes, duties, and assessments imposed on Customer in connection with fees paid under the provisions of this Agreement, including without limitation, all sales, use, excise or other taxes and duties. If any tax is required to be paid by Company, the full amount of such tax will be billed to Customer separately, whether or not this Agreement is then in effect and promptly paid by Customer.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>3.5. Disputed Charges. Customer must notify Company in writing of any dispute or disagreement with invoiced charges within thirty (30) calendar days after the date of receipt of the applicable invoice by Customer. Absent such notice, Customer shall be deemed to have agreed to the charges as invoiced.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>3.6. Suspension. If any amount owing by Customer under this Agreement is thirty (30) or more days past due, Company may, without limiting its other rights and remedies, accelerate Customer's unpaid fee obligations under this Agreement so that all such obligations become immediately due and payable, and suspend the Subscription and Services to Customer until such amounts are paid in full. Company will give Customer at least ten (10) days' prior notice that Customer's account is overdue before implementing any such suspension.</p>
<div style={pg.secTitle}>4. Confidential Information</div>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>4.1. Confidentiality. The Parties acknowledge that during the performance of this Agreement, each Party will have access to certain Confidential Information of the other Party or Confidential Information of third parties that the disclosing Party is required to maintain as confidential. "Confidential Information" means any non-public material, data or information of a Party that such disclosing Party treats as proprietary or confidential and is marked as "confidential" or "proprietary" or that, given the circumstances, should be reasonably apparent that such information is of a confidential or proprietary nature. Without limiting the foregoing, (i) the Company Licensed Software and all intellectual property rights associated therewith shall constitute Confidential Information of Company, (ii) Customer Data and the systems and networks of Customer shall constitute Confidential Information of Customer, and (iii) all software and any databases disclosed by a Party shall constitute Confidential Information of the disclosing Party.</p>
<Ft label="SeatOS – Software Subscription & Services Agreement" n={pgN()}/></div>

<div className="a4" style={pg.page}><Lg w={150}/><div style={pg.hr}/>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>4.2. Mutual Obligations. Except as may be expressly set forth in this Agreement, each Party that receives Confidential Information of the other Party agrees during the term of this Agreement and thereafter, to: (a) hold the Confidential Information of the other Party in confidence and restrict it from dissemination to, and use by, any third party; (b) protect the confidentiality of the other Party's Confidential Information using the same degree of care, but no less than reasonable degree of care, as the receiving Party uses to protect its own Confidential Information; and (c) restrict access to the Confidential Information of the other Party to such of its personnel, affiliates, subcontractors, and/or consultants who have a need to have access to such Confidential Information, who have been advised of the confidential nature of such information, and who have agreed in writing to terms no less protective than the terms set forth in this Agreement with respect to the treatment of such Confidential Information.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>4.3. Exceptions. Section 4.2 shall not apply to Confidential Information that is: (a) publicly available or in the public domain at the time disclosed; (b) publicly available, becomes publicly available or enters the public domain through no fault of the recipient; (c) rightfully communicated to the recipient by persons not bound by confidentiality obligations with respect thereto; (d) already in the recipient's possession free of any confidentiality obligations with respect thereto at the time of disclosure; (e) independently developed by the recipient without use of or reference to the disclosing Party's Confidential Information and by employees or other authorized agents of the receiving Party who have not been exposed to the disclosing Party's Confidential Information; or (f) approved for release or disclosure in writing by the disclosing Party.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>4.4. Compelled Disclosure. Notwithstanding the foregoing, each Party may disclose Confidential Information of the other Party to the limited extent required to: (a) comply with the order of a court or other governmental body, or as otherwise necessary to comply with applicable law, provided that the Party making the disclosure pursuant to the order shall, to the extent allowed by law, first have given written notice to the other Party and made a reasonable effort to obtain a protective order; or (b) establish a Party's rights under this Agreement, including to make such court filings as it may be required to do.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>4.5. Notification obligations. Each party will: (a) notify the other party promptly of any material unauthorized possession, use, or knowledge of the other party's Confidential Information by any person that may become known to such party; (b) promptly furnish to the other party details of the unauthorized possession, use, or knowledge, or attempt thereof, and use reasonable efforts to assist the other party in investigating or preventing the recurrence of any unauthorized possession, use, or knowledge, or attempt thereof, of Confidential Information; (c) use reasonable efforts to cooperate with the other party in any litigation and investigation against third parties deemed necessary by the other party to protect its proprietary rights; and (d) promptly use reasonable efforts to prevent a recurrence of any such unauthorized possession, use, or knowledge of Confidential Information.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>4.6. Confidentiality of Access Credentials. In addition to the foregoing obligations, Customer agrees to hold the Licensed Software, and all logins and passwords for the Subscription, in confidence, and to protect the confidential nature thereof, and shall not disclose any trade secrets contained, embodied, or utilized therein, to anyone other than a Permitted User having a need for such disclosure, and then only to allow use of the Licensed Software as authorized herein. Customer shall take all reasonable steps to ensure that the provisions of this Section are not violated by any employee, Permitted User, or any other person under Customer's control or in its service.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>4.7. Privacy. Each Party will comply, to the extent applicable, with data protection and data privacy laws in performing their obligations under this Agreement. Company's Data Protection Addendum is also available at [insert URL], and the terms of such Data Protection Addendum as of the Effective Date are hereby incorporated into this Agreement by reference. Customer may separately elect to execute such Data Protection Addendum provided that Customer returns a copy of such executed Data Protection Addendum to Company at privacy@bookaway.com.</p>
<div style={pg.secTitle}>5. Intellectual property and proprietary rights</div>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>5.1. Company. As between Company and Customer, Company and its licensors own all right, title and interest, including all intellectual property rights, in and to all Company Confidential Information, Aggregated Data, the Licensed Software (including, without limitation, all modifications, improvements, upgrades, derivative works, and feedback related thereto), associated Documentation, materials, information, processes or subject matter that is proprietary to Company and is provided under this Agreement. "Aggregated Data" is anonymous, statistical, analytical and other aggregated data that is collected automatically while performing the Services for the main purpose of improving the Services and that does not personally identify any individual or Permitted Users. Aggregated Data cannot be re-identified or de-aggregated. Company expressly reserves all rights not expressly granted to Customer under this Agreement and all executed Orders. Customer shall not knowingly engage in any act or omission that would impair the intellectual property rights of Company or its licensors. In no event shall Customer obtain any ownership rights in or to the Confidential Information of Company, the Company Software or any intellectual property rights of Company.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>5.2. Customer; License. As between Company and Customer, Customer and its licensors own all right, title and interest, including all Intellectual property rights, in and to the Customer Data and all Confidential Information disclosed by Customer. Company shall not knowingly engage in any act or omission that would impair Customer's Intellectual property rights or Confidential Information. In no event shall Company obtain any ownership rights in or to the Confidential Information of Customer, the Customer Data or Customer's Intellectual property rights. Customer hereby grants Company a worldwide, limited-term license to review, copy, clean, transmit, process, analyze and display Customer Data, as necessary for Company to provide the data quality monitoring and improvement services and for analytical purposes. Subject to the limited licenses granted herein, Company acquires no right, title or interest from Customer under this Agreement in or to Customer Data.</p>
<Ft label="SeatOS – Software Subscription & Services Agreement" n={pgN()}/></div>

<div className="a4" style={pg.page}><Lg w={150}/><div style={pg.hr}/>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>5.3. Suggestions. Customer hereby grants Company a royalty-free, worldwide, transferable, sublicenseable, irrevocable, perpetual license to use or incorporate into the Licensed Software, Subscription and/or Services any suggestions, enhancement requests, recommendations, correction or other feedback provided by Customer, including Permitted Users, relating to the functionality and/or operation of the Licensed Software or Subscription Services.</p>
<div style={pg.secTitle}>6. Term; Termination</div>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>6.1. Unless otherwise specified in the applicable Order, each term set forth in an Order ("Subscription Term") will begin on the Start Date set forth on the applicable Order, and remain in effect until the End Date set forth therein ("Initial Term"), and automatically and continuously renew for the additional time periods set forth therein until either party notifies the other that this Agreement will not renew at least thirty (30) days prior to the expiration of the then current Subscription Term.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>6.2. Unless otherwise terminated pursuant to this Section 6, the "Term" of this Agreement shall run from the Start Date of the first Subscription Order and continue until expiration or termination of the last renewal term under the Subscription Orders to this Agreement.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>6.3. Either party may terminate this Agreement, or any Order, for a material breach by the other party that is not cured within thirty (30) days after written notice of such material breach. The non-breaching party may elect to terminate the applicable Order only or the Agreement as a whole (and thus, all Orders hereunder); but shall identify its selection in writing in the original notice of breach.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>6.4. Either party may terminate this Agreement or any Order, or suspend its performance hereunder or thereunder, if the other party becomes insolvent or bankrupt or ceases to do business.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>6.5. Upon any termination of this Agreement, Customer shall immediately discontinue all use of the Licensed Software Subscription and Services and promptly pay to Company any amounts that may be due and payable under this Agreement. In addition, each Party shall: (a) immediately discontinue all use of the other Party's Confidential Information; (b) at the option of the disclosing Party, either return or destroy all Confidential Information of the disclosing Party in its possession; and (c) delete the disclosing Party's Confidential Information from its computer storage or any other media, except for archival copies which may be retained and shall be destroyed in accordance with the party's record retention policy. Any such retained copies shall remain subject to Section 4 (Confidentiality). Each Party will, on request from the disclosing Party, provide the disclosing Party with a written certification of compliance with this Section 6.5 signed by an officer.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>6.6. Neither expiration nor termination of this Agreement will terminate those obligations and rights of the parties pursuant to provisions of this Agreement which by their express terms are intended to survive and such provisions will survive the expiration or termination of this Agreement. Without limiting the foregoing, the respective rights and obligations of the parties under Sections 1.4, 1.5, 2.1, 3.4, 4, 5, 6.5, 6.6, 7.3, 8, 9 and 10 will survive the expiration or termination of this Agreement regardless of when such termination becomes effective.</p>
<Ft label="SeatOS – Software Subscription & Services Agreement" n={pgN()}/></div>

<div className="a4" style={pg.page}><Lg w={150}/><div style={pg.hr}/><div style={pg.secTitle}>7. Warranties; Disclaimers</div>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>7.1. Company warrants that the Subscription will materially conform to the specifications in the Documentation and the applicable Order for the Subscription Term and Company shall use commercially reasonable efforts to correct material defects that are reported by Customer or its Permitted Users. Company agrees to perform the Services in a professional and workmanlike manner. Company warrants that, to the best of its knowledge, the Licensed Software does not contain software code whose purpose is to disrupt, damage, or interfere with Customer systems, software, or data ("Virus"). Company's warranty obligations hereunder do not apply to the extent the nonconformity results from the use of the Subscription or Services contrary to the terms of this Agreement or the instructions in any applicable Documentation. Company does not warrant any third-party hardware or software. If Company determines that a malfunction is due to a problem with Customer hardware or software, Company will so inform Customer, and it will be Customer's responsibility to obtain and pay for any repairs or modifications required.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>7.2. Customer is solely responsible for obtaining all necessary rights and consents regarding its Customer Data and its monitoring via the Licensed Software and hereby warrants that providing access to such Customer Data to Company under this Agreement will not violate or infringe the rights of any third party (including privacy rights).</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>7.3. EXCEPT AS SPECIFICALLY SET FORTH IN THIS AGREEMENT, THE SUBSCRIPTION, SERVICES, AND LICENSED SOFTWARE ARE PROVIDED "AS IS." COMPANY, ITS LICENSORS AND SERVICE PROVIDERS DO NOT MAKE ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, OR NONINFRINGEMENT, OR ARISING FROM A COURSE OF DEALING OR USAGE OF TRADE, AND COMPANY EXPRESSLY DISCLAIMS ANY AND ALL SUCH WARRANTIES. Company does not warrant that: (a) the Subscription or the operation of any of the Licensed Software will be uninterrupted or error free or (b) the Licensed Software will operate in combination with other hardware or software unless such hardware or software is expressly approved or recommended by Company. Customer acknowledges and agrees that Company and its licensors are not responsible for: (i) the performance of Customer's or its Permitted Users' equipment, systems or networks, (ii) delivery of services or connectivity provided by third parties to Customer and its Permitted Users, or (iii) any downtime, loss, or corruption of Customer Data that occurs as a result of transmitting or receiving Customer Data or Viruses due to Customer's, or its Permitted Users', lack of security practices or due to connection and access to the internet.</p>
<div style={pg.secTitle}>8. Indemnification</div>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>8.1. Company will defend, indemnify, and hold Customer harmless from and against any loss, cost, and expense that Customer suffers in connection with a third-party claim that use of the Company Licensed Software infringes any United States trade secret, trademark, or copyright of any third party. Customer will defend, indemnify, and hold Company harmless from and against any loss, cost, and expense that Company may suffer in connection with Customer Data provided to Company in contravention with Section 2.2 and 2.3.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>8.2. Company's obligations under this Section 8 are expressly conditioned on the following: Customer shall (a) promptly notify Company in writing of any such claim of which Customer has actual knowledge, (b) in writing, grant Company sole control of the defense of any such claim and of all negotiations for its settlement or compromise, provided that no such settlement or compromise may impose any monetary or other obligations on Customer, and (c) reasonably cooperate with Company to facilitate the settlement or defense of the claim.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>8.3. Should the Licensed Software become, or in Company's opinion be likely to become, the subject of a claim of infringement of a trade secret, trademark, or copyright, Company may (a) procure for Customer, at no additional cost to Customer, the right to continue to use the Subscription, (b) replace or modify the Licensed Software, at no cost to Customer, to make it non-infringing, provided that the same function is performed by the replacement or modified Licensed Software, or (c) if in Company's judgment the right to continue to use the Subscription cannot be reasonably procured or the Licensed Software cannot reasonably be replaced or modified, terminate this Agreement and grant Customer a pro-rated refund of any advance fees paid applicable to the remainder of the Subscription Term.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>8.4. This Section 8 states the entire liability of Company with respect to infringement by the Company Licensed Software, or any parts thereof, and Company shall have no additional liability with respect to any alleged or proven infringement.</p>
<Ft label="SeatOS – Software Subscription & Services Agreement" n={pgN()}/></div>

<div className="a4" style={pg.page}><Lg w={150}/><div style={pg.hr}/><div style={pg.secTitle}>9. Limitation of Liability; Damages</div>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>9.1. SUBJECT TO SECTION 9.2, (A) IN NO EVENT WILL EITHER PARTY BE LIABLE TO THE OTHER FOR SPECIAL, INDIRECT, INCIDENTAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES IN CONNECTION WITH THE LICENSED SOFTWARE, SUBSCRIPTION, SERVICES, OR THE PERFORMANCE OR NONPERFORMANCE OF SERVICES OR ANY ORDER, REGARDLESS OF THE THEORY OF LIABILITY, EVEN IF SUCH PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES; (B) IN NO EVENT WILL EITHER PARTY BE LIABLE TO THE OTHER PARTY FOR ANY LOSS OF REVENUES, LOSS OF PROFITS, LOSS OF BUSINESS, OR LOSS OF DATA, ARISING OUT OF THE USE OF, OR INABILITY TO USE, THE COMPANY SOFTWARE PRODUCTS, OR THE PERFORMANCE OR NONPERFORMANCE OF COMPANY SOFTWARE OR SERVICES; AND (C) COMPANY'S MAXIMUM LIABILITY UNDER THIS AGREEMENT IS LIMITED TO THE FEES PAID BY CUSTOMER UNDER THE APPLICABLE ORDER TO WHICH THE CLAIM RELATES DURING THE TWELVE (12) MONTHS PRECEDING THE DATE ON WHICH THE CLAIM FIRST ACCRUED.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>9.2. NOTHING IN THIS AGREEMENT EXCLUDES OR LIMITS A PARTY'S LIABILITY FOR (A) FRAUD OR FRAUDULENT MISREPRESENTATION, OR (B) ANY LIABILITY WHICH CANNOT LEGALLY BE EXCLUDED OR LIMITED.</p>
<div style={pg.secTitle}>10. Miscellaneous</div>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>10.1. General. This Agreement supersedes all previous discussions, negotiations, understandings, and agreements between the parties with respect to its subject matter and constitutes the entire Agreement between the parties. No oral statements or prior written material not specifically incorporated herein will be of any force and effect, and no changes in or additions to this Agreement will be recognized unless incorporated herein by amendment as provided herein and signed by duly authorized representatives of both parties. The application of Customer's general terms and conditions in any general vendor acknowledgement or Customer's other general purchasing conditions are hereby expressly excluded and objected to by Company. This Agreement shall apply and supersede the pre-printed terms and conditions of any form submitted by either party, unless such form is executed by both parties. This Agreement is a collaborative drafting effort, and the provisions of the Agreement will not be construed against a party as the purported drafter. The waiver by either party of a breach or violation of any provision of this Agreement will not operate as, or be construed to be, a waiver of any subsequent breach of the same or any other provision hereof. In the event any provision of this Agreement is held to be unenforceable for any reason, the unenforceability thereof will not affect the remainder of this Agreement, which will remain in full force and effect and enforceable in accordance with its terms. With respect to any unenforceable provision, the applicable arbitrator or court shall deem the provision modified to the extent necessary, in such adjudicator's opinion, to render such term or provision enforceable, and the rights and obligations of the parties will be construed and enforced accordingly, preserving to the fullest permissible extent the intent and agreements of the parties set forth herein. Headings in this Agreement shall not be used to interpret or construe its provisions.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>10.2. Precedence. The following order of precedence will be followed in resolving any inconsistencies between the terms of this Agreement and the terms of any Orders, exhibits, statements of work, or other documents: first, the terms contained in the body of this Agreement (which may give priority to Orders for certain purposes); second, the terms of the Subscription Orders; third, the terms of any statement of work or attachment under an Order; and fourth, the terms of any other documents referenced in any of the foregoing.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>10.3. Public Announcements. Customer grants Company the right to use Customer's name, logo, trademarks, and/or trade names in press releases, product brochures, sales presentations, financial reports, and on its websites indicating that Customer is a customer of Company. All other public statements or releases require the mutual consent of the parties.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>10.4. Independent Contractor. The relationship of the parties hereunder is that of independent contractors, and neither party shall be considered to be a partner, joint venture, employer, or employee of the other under this Agreement. This Agreement creates no agency in either party, and neither party has any authority whatsoever to bind the other party in any transaction or make any representations on behalf of the other party.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>10.5. Notice. Any notice or demand which is required or provided to be given under this Agreement will be deemed to have been sufficiently given and received for all purposes when delivered by hand, confirmed electronic transmission, or nationally recognized overnight courier, or five (5) days after being sent by certified or registered mail, postage and charges prepaid, return receipt requested, to the address, or the e-mail address identified in the applicable Order, and to the attention of such other person(s) or officer(s) as either party may designate by written notice.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>10.6. Assignment. Neither party may assign this Agreement, or any of its interest herein, without the prior written consent of the other party, which consent may not be unreasonably withheld or delayed; provided, however, that no such prior approval shall be required for an assignment to a subsidiary of the Company or in connection with a sale of all or substantially all of a party's business related to the subject matter of this Agreement or any merger, sale of a controlling interest, or other change of control of such party. This Agreement applies to and binds the permitted successors and assigns of the parties.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>10.7. Force Majeure. Neither party will be in default or otherwise liable for any delay in or failure of its performance under this Agreement if such delay or failure arises by any reason beyond its reasonable control, including any act of God or the common enemy or earthquakes, floods, fires, epidemics, riots, or failures or delays in transportation or communications. The parties will promptly inform and consult with each other as to any of the above causes which in their judgment may or could be the cause of a delay in the performance of this Agreement.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>10.8. Governing Law. Without regard to its conflicts of laws principles, the laws of Singapore govern all matters arising under or relating to this Agreement. The United Nations Convention on Contracts for the International Sale of Goods do not apply to this Agreement. The parties further agree that the party which substantially prevails in a dispute shall be entitled to an award of attorneys' fees and costs.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>10.9. Dispute Resolution. In any legal action relating to this Agreement, Customer agrees to the exercise of jurisdiction over it by the competent court in Singapore. Customer agrees that, if it brings any such action, it shall do so in the competent court in Singapore.</p>
<p style={{fontSize:9,marginBottom:5,textAlign:"justify"}}>10.10. Language. The original and controlling version of this Agreement shall be the version using the English Language. All translations of this Agreement into other languages shall be for the convenience of the Parties only and shall not control the meaning or application of this Agreement. All notices and other communications required or permitted by this Agreement must be in English, and the interpretation and application of such notices and other communications shall be based solely upon the English language version thereof.</p>
<Ft label="SeatOS – Software Subscription & Services Agreement" n={pgN()}/></div>

{/* AMENDMENT */}
{f.includeAmendment&&(
<div className="a4" style={pg.page}><Lg w={150}/><div style={pg.hr}/><div style={{...pg.title,fontSize:13,margin:"16px 0 10px"}}>AMENDMENT TO SOFTWARE SUBSCRIPTION &amp; SERVICES AGREEMENT</div><p style={{fontSize:9.5,marginBottom:6,textAlign:"justify"}}>This Amendment to the Software Subscription &amp; Services Agreement (the "<b>Amendment</b>") is entered into as of 17 November 2025 ("<b>Effective Date</b>"), by and between:</p><p style={{fontSize:9.5,marginBottom:4,marginLeft:20}}>(a) <b>SeatOS, operated by Bookaway Ltd.</b>, a company incorporated under the laws of Israel, having its registered office at 6 HaTa'as St., Ramat Gan, Israel 5251247 ("<b>Company</b>"); and</p><p style={{fontSize:9.5,marginBottom:8,marginLeft:20}}>(b) <b>[{bl(f.customerName,"Customer Name")}]</b>, a company incorporated under the laws of {f.country}, having its registered office at [{bl(f.address,"Customer Address")}] ("<b>Customer</b>").</p><p style={{fontSize:9.5,marginBottom:6}}>Each is referred to as a "<b>Party</b>" and collectively as the "<b>Parties</b>".</p><p style={{fontSize:9.5,marginBottom:8}}><b>WHEREAS</b>, the Parties entered into the Agreement dated 17 November 2025 and wish to amend it as follows:</p><div style={{fontWeight:700,fontSize:10,margin:"8px 0 4px"}}>1. Amendment</div><p style={{fontSize:9.5,marginBottom:4}}>The following clause is hereby added to the Agreement as clause number 3.3:</p><p style={{fontSize:9,fontStyle:"italic",marginBottom:8,textAlign:"justify",paddingLeft:8,borderLeft:"2px solid #F5B731"}}>"3.6 Offset. The Customer hereby acknowledges and agrees that the Company shall have the right to offset any outstanding amounts or balances owed by the Customer to the Company against any amounts payable by the Company directly, or by its direct or indirect subsidiaries or any other affiliate, controlling, controlled by or under common control with the Company, whether such amounts arise under contract or pursuant to applicable law. The Company may exercise this right at any time, in its sole discretion, without the need for prior consent or notification to the Customer to effectuate such offset. The Customer further agrees to cooperate with the Company, including providing or executing any necessary documents, to evidence such offset."</p><div style={{fontWeight:700,fontSize:10,margin:"8px 0 4px"}}>2. General</div><p style={{fontSize:9.5,marginBottom:5,textAlign:"justify"}}>Except as expressly amended by this Amendment, all other terms and conditions of the Original Agreement shall remain in full force and effect. This Amendment shall be deemed an integral part of the Agreement. In the event of any inconsistency, this Amendment shall prevail.</p><div style={{fontWeight:700,fontSize:10,margin:"8px 0 4px"}}>3. No Company Seal</div><p style={{fontSize:9.5,marginBottom:10,textAlign:"justify"}}>The Parties agree that this Amendment shall be executed without the affixation of any company seal. The absence of a seal shall not affect the validity or binding nature of this Amendment.</p><p style={{fontSize:9.5,fontWeight:700,marginBottom:16}}>IN WITNESS WHEREOF, the Parties have executed this Amendment Agreement as of the Effective Date.</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}><div><div style={{fontWeight:700,fontSize:10,marginBottom:12}}>COMPANY</div><div style={{borderBottom:"1px solid #333",marginBottom:4,paddingBottom:30}}>By</div><p style={{fontSize:9.5,margin:"4px 0"}}>Name: {co.signName}</p><p style={{fontSize:9.5,margin:"4px 0"}}>Title: {co.signTitle}</p></div><div><div style={{fontWeight:700,fontSize:10,marginBottom:12}}>CUSTOMER</div><div style={{borderBottom:"1px solid #333",marginBottom:4,paddingBottom:30}}>By</div><p style={{fontSize:9.5,margin:"4px 0"}}>Name: {bl(f.custSignName)}</p><p style={{fontSize:9.5,margin:"4px 0"}}>Title: {bl(f.custSignTitle)}</p></div></div><Ft label="SeatOS – Amendment" n={pgN()}/></div>)}

      </div>
    </div>
  )
}
