'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const pretty = s => (s || '').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default function Home(){
  const [session,setSession]=useState(null)
  const [loading,setLoading]=useState(true)
  const [authMode,setAuthMode]=useState('login')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [message,setMessage]=useState('')
  const [membership,setMembership]=useState(null)
  const [dealer,setDealer]=useState(null)
  const [locations,setLocations]=useState([])
  const [vehicles,setVehicles]=useState([])
  const [keys,setKeys]=useState([])
  const [jobs,setJobs]=useState([])
  const [loans,setLoans]=useState([])
  const [query,setQuery]=useState('')
  const [modal,setModal]=useState(null)
  const [selected,setSelected]=useState(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return ()=>subscription.unsubscribe()
  },[])
  useEffect(()=>{ if(session) loadAll(); else resetData() },[session])

  function resetData(){setMembership(null);setDealer(null);setVehicles([]);setLocations([]);setKeys([]);setJobs([]);setLoans([])}

  async function loadAll(){
    setMessage('')
    const {data:m,error:me}=await supabase.from('dealership_members').select('*').eq('user_id',session.user.id).eq('active',true).maybeSingle()
    if(me){setMessage(me.message);return}
    if(!m){setMessage('Your account is signed in, but it has not yet been assigned to a dealership.');return}
    setMembership(m)
    const dealerId=m.dealership_id
    const [{data:d},{data:l},{data:v},{data:k},{data:w},{data:ln}] = await Promise.all([
      supabase.from('dealerships').select('*').eq('id',dealerId).single(),
      supabase.from('locations').select('*').eq('dealership_id',dealerId).order('name'),
      supabase.from('vehicles').select('*').eq('dealership_id',dealerId).order('created_at',{ascending:false}),
      supabase.from('keys').select('*').eq('dealership_id',dealerId).order('key_code'),
      supabase.from('workshop_jobs').select('*').eq('dealership_id',dealerId).order('created_at',{ascending:false}),
      supabase.from('loan_agreements').select('*').eq('dealership_id',dealerId).order('created_at',{ascending:false})
    ])
    setDealer(d);setLocations(l||[]);setVehicles(v||[]);setKeys(k||[]);setJobs(w||[]);setLoans(ln||[])
  }

  async function authSubmit(e){
    e.preventDefault();setMessage('')
    if(authMode==='signup'){
      const {error}=await supabase.auth.signUp({email,password,options:{data:{display_name:'Connie'}}})
      setMessage(error?error.message:'Account created. Check your email if confirmation is required, then sign in.')
    } else {
      const {error}=await supabase.auth.signInWithPassword({email,password})
      if(error)setMessage(error.message)
    }
  }

  const filtered=useMemo(()=>vehicles.filter(v=>[v.registration,v.vin,v.make,v.model,v.car_sruth_ref,v.stock_number].some(x=>(x||'').toLowerCase().includes(query.toLowerCase()))),[vehicles,query])
  const counts={stock:vehicles.filter(v=>['for_sale','reserved'].includes(v.sales_status)).length,off:vehicles.filter(v=>['bodyshop','valeting','on_loan','trader_sor','off_site'].includes(v.operational_status)).length,workshop:jobs.filter(j=>!['complete','collected','cancelled'].includes(j.status)).length,loan:loans.filter(l=>l.status==='out').length}

  if(loading)return <div className="login"><div className="loginBox">Loading CarSruth…</div></div>
  if(!session)return <div className="login"><form className="loginBox" onSubmit={authSubmit}>
    <div className="brand">Car<span>Sruth</span></div><div className="sub">by CT Automotive • One Vehicle. One Record. One Journey.</div>
    <h2>{authMode==='login'?'Sign in':'Create account'}</h2>
    {message&&<div className={message.startsWith('Account')?'success':'error'}>{message}</div>}
    <div className="field"><label>Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
    <div className="field"><label>Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/></div>
    <button className="btn primary" style={{width:'100%'}}>{authMode==='login'?'Sign in':'Create account'}</button>
    <button type="button" className="btn" style={{width:'100%',marginTop:10}} onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setMessage('')}}>{authMode==='login'?'First time? Create account':'Already registered? Sign in'}</button>
  </form></div>

  return <main className="wrap">
    <div className="top"><div><div className="brand">Car<span>Sruth</span></div><div className="sub">{dealer?.name||'Loading dealership…'} • {membership?.role&&pretty(membership.role)}</div></div><button className="btn" onClick={()=>supabase.auth.signOut()}>Sign out</button></div>
    {message&&<div className="error">{message}</div>}
    <div className="grid">
      <div className="card"><div className="metric">{counts.stock}</div><div className="label">Retail / Reserved Stock</div></div>
      <div className="card"><div className="metric">{counts.off}</div><div className="label">Vehicles Off Site</div></div>
      <div className="card"><div className="metric">{counts.workshop}</div><div className="label">Workshop WIP</div></div>
      <div className="card"><div className="metric">{counts.loan}</div><div className="label">Courtesy Cars Out</div></div>
    </div>
    <div className="actions">
      <button className="action primary" onClick={()=>setModal('vehicle')}>＋ Vehicle In</button>
      <button className="action" onClick={()=>document.getElementById('search').focus()}>⌕ Find Vehicle</button>
      <button className="action" onClick={()=>setModal('key')}>⌁ Add / Assign Key</button>
      <button className="action" onClick={()=>setModal('move')}>↔ Move Vehicle</button>
    </div>
    <div className="sectionTitle"><div><h2 style={{margin:0}}>Vehicle Hub</h2><div className="muted">Live master vehicle records</div></div></div>
    <div className="toolbar"><input id="search" className="input" style={{maxWidth:500}} placeholder="Search REG, VIN, CarSruth ID, make or model…" value={query} onChange={e=>setQuery(e.target.value)}/><button className="btn" onClick={loadAll}>Refresh</button></div>
    <div className="card tableWrap"><table className="table"><thead><tr><th>Vehicle</th><th>CarSruth ID</th><th>Status</th><th>Location</th><th>Website</th><th></th></tr></thead><tbody>
      {filtered.map(v=><tr key={v.id}><td><b>{v.registration||'No reg yet'}</b><div className="muted">{[v.make,v.model,v.derivative].filter(Boolean).join(' ')||'Vehicle details pending'}</div></td><td>{v.car_sruth_ref}</td><td><span className="pill">{pretty(v.sales_status)}</span></td><td>{pretty(v.operational_status)}{v.location_detail?` • ${v.location_detail}`:''}</td><td>{pretty(v.website_status)}</td><td><button className="btn" onClick={()=>{setSelected(v);setModal('detail')}}>Open</button></td></tr>)}
      {!filtered.length&&<tr><td colSpan="6" className="muted">No vehicles yet.</td></tr>}
    </tbody></table></div>
    {modal==='vehicle'&&<VehicleModal dealerId={membership.dealership_id} locations={locations} close={()=>setModal(null)} done={async()=>{setModal(null);await loadAll()}}/>}
    {modal==='key'&&<KeyModal dealerId={membership.dealership_id} vehicles={vehicles} close={()=>setModal(null)} done={async()=>{setModal(null);await loadAll()}}/>}
    {modal==='move'&&<MoveModal vehicles={vehicles} locations={locations} close={()=>setModal(null)} done={async()=>{setModal(null);await loadAll()}}/>}
    {modal==='detail'&&selected&&<DetailModal vehicle={selected} keys={keys} jobs={jobs} close={()=>{setSelected(null);setModal(null)}}/>}
  </main>
}

function ModalShell({title,children,close}){return <div className="modal" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="modalBody"><div className="top"><h2 style={{margin:0}}>{title}</h2><button className="btn" onClick={close}>Close</button></div>{children}</div></div>}

function VehicleModal({dealerId,locations,close,done}){
  const [f,setF]=useState({registration:'',vin:'',make:'',model:'',derivative:'',colour:'',mileage_km:'',operational_status:'on_site',sales_status:'not_for_sale',website_status:'not_listed',vehicle_type:'stock',current_location_id:locations[0]?.id||'',location_detail:''})
  const [err,setErr]=useState('')
  const ch=(k,v)=>setF(x=>({...x,[k]:v}))
  async function save(e){e.preventDefault();setErr('');const payload={...f,dealership_id:dealerId,mileage_km:f.mileage_km?Number(f.mileage_km):null,current_location_id:f.current_location_id||null}; const {error}=await supabase.from('vehicles').insert(payload); if(error)setErr(error.message);else done()}
  return <ModalShell title="Vehicle In" close={close}><form onSubmit={save}>{err&&<div className="error">{err}</div>}<div className="row"><F l="Registration"><input className="input" value={f.registration} onChange={e=>ch('registration',e.target.value.toUpperCase())}/></F><F l="VIN"><input className="input" value={f.vin} onChange={e=>ch('vin',e.target.value.toUpperCase())}/></F></div><div className="row3"><F l="Make"><input className="input" value={f.make} onChange={e=>ch('make',e.target.value)}/></F><F l="Model"><input className="input" value={f.model} onChange={e=>ch('model',e.target.value)}/></F><F l="Derivative"><input className="input" value={f.derivative} onChange={e=>ch('derivative',e.target.value)}/></F></div><div className="row"><F l="Colour"><input className="input" value={f.colour} onChange={e=>ch('colour',e.target.value)}/></F><F l="Mileage km"><input className="input" type="number" value={f.mileage_km} onChange={e=>ch('mileage_km',e.target.value)}/></F></div><div className="row"><F l="Vehicle type"><select className="select" value={f.vehicle_type} onChange={e=>ch('vehicle_type',e.target.value)}>{['stock','customer','trade','demo','courtesy'].map(x=><option key={x} value={x}>{pretty(x)}</option>)}</select></F><F l="Sales status"><select className="select" value={f.sales_status} onChange={e=>ch('sales_status',e.target.value)}>{['not_for_sale','for_sale','reserved','sold'].map(x=><option key={x}>{x}</option>)}</select></F></div><div className="row"><F l="Operational status"><select className="select" value={f.operational_status} onChange={e=>ch('operational_status',e.target.value)}>{['due_in','on_site','compound','workshop','bodyshop','valeting','on_loan','trader_sor','off_site'].map(x=><option key={x}>{x}</option>)}</select></F><F l="Location"><select className="select" value={f.current_location_id} onChange={e=>ch('current_location_id',e.target.value)}><option value="">No internal location</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></F></div><F l="Location detail"><input className="input" placeholder="Row C, Ramp 4, external site…" value={f.location_detail} onChange={e=>ch('location_detail',e.target.value)}/></F><button className="btn primary">Save vehicle</button></form></ModalShell>
}

function KeyModal({dealerId,vehicles,close,done}){
  const [vehicle,setVehicle]=useState('');const [code,setCode]=useState('');const [type,setType]=useState('stock');const [err,setErr]=useState('')
  async function suggest(){const {data,error}=await supabase.rpc('next_stock_key',{p_dealership:dealerId,p_prefix:type==='workshop_reusable'?'W':type==='courtesy'?'L':'K'});if(error)setErr(error.message);else setCode(data)}
  async function save(e){e.preventDefault();setErr('');let c=code;if(!c){const {data,error}=await supabase.rpc('next_stock_key',{p_dealership:dealerId,p_prefix:type==='workshop_reusable'?'W':type==='courtesy'?'L':'K'});if(error){setErr(error.message);return}c=data}
    const {data:k,error:ke}=await supabase.from('keys').insert({dealership_id:dealerId,key_code:c,key_type:type,status:vehicle?'assigned':'available'}).select().single();if(ke){setErr(ke.message);return}
    if(vehicle){const {error:ve}=await supabase.from('vehicle_keys').insert({dealership_id:dealerId,vehicle_id:vehicle,key_id:k.id,is_primary:true});if(ve){setErr(ve.message);return}}
    done()
  }
  return <ModalShell title="Add / Assign Key" close={close}><form onSubmit={save}>{err&&<div className="error">{err}</div>}<div className="row"><F l="Key type"><select className="select" value={type} onChange={e=>setType(e.target.value)}>{['stock','workshop_reusable','courtesy','spare','other'].map(x=><option key={x} value={x}>{pretty(x)}</option>)}</select></F><F l="Key number"><div style={{display:'flex',gap:8}}><input className="input" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Auto e.g. K001"/><button type="button" className="btn" onClick={suggest}>Suggest</button></div></F></div><F l="Assign to vehicle (optional)"><select className="select" value={vehicle} onChange={e=>setVehicle(e.target.value)}><option value="">Unassigned / reusable tag</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.registration||v.car_sruth_ref} — {v.make||''} {v.model||''}</option>)}</select></F><button className="btn primary">Save key</button></form></ModalShell>
}

function MoveModal({vehicles,locations,close,done}){
  const [vehicle,setVehicle]=useState('');const [status,setStatus]=useState('on_site');const [loc,setLoc]=useState('');const [detail,setDetail]=useState('');const [note,setNote]=useState('');const [err,setErr]=useState('')
  async function save(e){e.preventDefault();setErr('');const {error}=await supabase.rpc('record_vehicle_move',{p_vehicle:vehicle,p_to_status:status,p_to_location:loc||null,p_external_party:null,p_location_detail:detail||null,p_note:note||null});if(error)setErr(error.message);else done()}
  return <ModalShell title="Move Vehicle" close={close}><form onSubmit={save}>{err&&<div className="error">{err}</div>}<F l="Vehicle"><select className="select" value={vehicle} onChange={e=>setVehicle(e.target.value)} required><option value="">Choose vehicle…</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.registration||v.car_sruth_ref} — {v.make||''} {v.model||''}</option>)}</select></F><div className="row"><F l="New status"><select className="select" value={status} onChange={e=>setStatus(e.target.value)}>{['on_site','compound','workshop','bodyshop','valeting','on_loan','trader_sor','off_site','delivered'].map(x=><option key={x}>{x}</option>)}</select></F><F l="Internal location"><select className="select" value={loc} onChange={e=>setLoc(e.target.value)}><option value="">External / no internal location</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></F></div><F l="Location detail"><input className="input" value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Bodyshop name, Row B, customer loan…"/></F><F l="Movement note"><textarea className="textarea" value={note} onChange={e=>setNote(e.target.value)}/></F><button className="btn primary">Record movement</button></form></ModalShell>
}

function DetailModal({vehicle,keys,jobs,close}){
  const assigned=keys.filter(k=>k.status==='assigned')
  return <ModalShell title={vehicle.registration||vehicle.car_sruth_ref} close={close}><div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}><div className="card"><div className="label">CarSruth ID</div><div style={{fontSize:20,fontWeight:700}}>{vehicle.car_sruth_ref}</div></div><div className="card"><div className="label">VIN</div><div style={{fontSize:16,fontWeight:700}}>{vehicle.vin||'Not recorded'}</div></div></div><h3>Vehicle</h3><p>{[vehicle.make,vehicle.model,vehicle.derivative].filter(Boolean).join(' ')||'Details pending'}</p><p className="muted">Status: {pretty(vehicle.operational_status)} • Sales: {pretty(vehicle.sales_status)} • Website: {pretty(vehicle.website_status)}</p><h3>Key register</h3><p className="muted">Key assignment history and QR printing will be added to this live screen next.</p><h3>Workshop</h3><p>{jobs.filter(j=>j.vehicle_id===vehicle.id).length} linked job(s)</p></ModalShell>
}
function F({l,children}){return <div className="field"><label>{l}</label>{children}</div>}
