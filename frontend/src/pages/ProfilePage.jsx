/**
 * ProfilePage.jsx
 * Avatar upload fixed:
 *  1. Instant local preview via URL.createObjectURL
 *  2. Backend returns "/uploads/avatars/x.jpg" → we prefix server base URL
 *  3. updateUser() syncs avatar to sidebar + topbar immediately
 *  4. Spinner overlay while uploading
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Save, Eye, EyeOff, Shield, AlertTriangle, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { userService } from "../services/authService";
import { authService } from "../services/authService";
import Toggle from "../components/ui/Toggle";
import toast from "react-hot-toast";

// ─── Server base URL (strips /api suffix) ─────────────────────────────────────
const SERVER_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
  .replace(/\/api\/?$/, "");

// Build full avatar URL from whatever backend returns
function buildAvatarUrl(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:")) {
    return path;
  }
  return `${SERVER_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

// ─── Static data ───────────────────────────────────────────────────────────────
const GENDERS = [
  { value:"male",             icon:"♂",  labelKey:"profile.male"      },
  { value:"female",           icon:"♀",  labelKey:"profile.female"    },
  { value:"other",            icon:"⚧",  labelKey:"profile.other"     },
  { value:"prefer_not_to_say",icon:"🔒", labelKey:"profile.preferNot" },
];
const AGE_GROUPS  = ["under_18","18_25","26_35","36_45","45_plus"];
const PROFESSIONS = ["Student","Software Engineer","Business Owner","Doctor","Teacher","Freelancer","Other"];
const BUDGETS = [
  { label:"Under ₹10,000", min:0,      max:10000   },
  { label:"₹10k – ₹50k",  min:10000,  max:50000   },
  { label:"₹50k – ₹1L",   min:50000,  max:100000  },
  { label:"₹1L – ₹2L",    min:100000, max:200000  },
  { label:"Above ₹2L",    min:200000, max:9999999 },
];
const NOTIF_PREFS = [
  { key:"emailNotifications", labelKey:"profile.emailNotif",  icon:"📧" },
  { key:"smsNotifications",   labelKey:"profile.smsAlerts",   icon:"📱" },
  { key:"whatsappNotifs",     labelKey:"profile.whatsapp",    icon:"💬" },
  { key:"pushNotifications",  labelKey:"profile.pushNotif",   icon:"🔔" },
  { key:"priceDropAlerts",    labelKey:"profile.priceAlerts", icon:"📉" },
  { key:"trendAlerts",        labelKey:"profile.trendAlerts", icon:"🔥" },
  { key:"weeklyDigest",       labelKey:"profile.weeklyDigest",icon:"📊" },
];

// ─── Small reusable pieces ────────────────────────────────────────────────────
function Card({ children, danger = false }) {
  return (
    <div style={{
      background: danger ? "rgba(244,63,94,.02)" : "var(--bg2)",
      border: `1px solid ${danger ? "rgba(244,63,94,.2)" : "var(--border)"}`,
      borderRadius:16, padding:"1.5rem",
    }}>
      {children}
    </div>
  );
}

function CardTitle({ icon, text }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:".6rem", marginBottom:"1.25rem", paddingBottom:".875rem", borderBottom:"1px solid var(--border)" }}>
      <span>{icon}</span>
      <span style={{ fontSize:".78rem", fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", color:"var(--text2)" }}>{text}</span>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize:".68rem", letterSpacing:".12em", textTransform:"uppercase", color:"var(--text3)", marginBottom:".4rem" }}>{children}</div>;
}

function ReadValue({ children }) {
  return (
    <div style={{ fontSize:".875rem", color: children ? "var(--text)" : "var(--text3)", background:"var(--card)", border:"1px solid var(--border)", borderRadius:8, padding:".65rem .875rem" }}>
      {children || "—"}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  const [f, setF] = useState(false);
  return (
    <input value={value} onChange={onChange} placeholder={placeholder}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{ width:"100%", fontFamily:"'DM Sans',sans-serif", fontSize:".875rem", color:"var(--text)", background:f?"var(--active)":"var(--card)", border:`1px solid ${f?"var(--border2)":"var(--border)"}`, borderRadius:8, padding:".65rem .875rem", outline:"none", boxSizing:"border-box" }} />
  );
}

function SelectInput({ value, onChange, children }) {
  const [f, setF] = useState(false);
  return (
    <select value={value} onChange={onChange} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{ width:"100%", fontFamily:"'DM Sans',sans-serif", fontSize:".875rem", color:"var(--text)", background:f?"var(--active)":"var(--card)", border:`1px solid ${f?"var(--border2)":"var(--border)"}`, borderRadius:8, padding:".65rem .875rem", outline:"none", cursor:"pointer", appearance:"none", boxSizing:"border-box" }}>
      {children}
    </select>
  );
}

function PwdField({ label, value, onChange, show, onToggle }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom:".875rem" }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position:"relative" }}>
        <input type={show?"text":"password"} value={value} onChange={onChange} placeholder="••••••••"
          onFocus={()=>setF(true)} onBlur={()=>setF(false)}
          style={{ width:"100%", fontFamily:"'DM Sans',sans-serif", fontSize:".875rem", color:"var(--text)", background:f?"var(--active)":"var(--card)", border:`1px solid ${f?"var(--border2)":"var(--border)"}`, borderRadius:8, padding:".65rem 2.5rem .65rem .875rem", outline:"none", boxSizing:"border-box" }} />
        <button type="button" onClick={onToggle} style={{ position:"absolute", right:".75rem", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text3)", display:"flex" }}>
          {show ? <EyeOff size={14}/> : <Eye size={14}/>}
        </button>
      </div>
    </div>
  );
}

function GoldBtn({ onClick, disabled, children }) {
  return (
    <motion.button onClick={onClick} disabled={disabled}
      whileHover={!disabled?{y:-1}:{}} whileTap={!disabled?{scale:.97}:{}}
      style={{ flex:1, background:disabled?"var(--card)":"linear-gradient(135deg,var(--gold),var(--gold2))", color:disabled?"var(--text3)":"var(--bg)", border:"none", borderRadius:8, padding:".72rem 1rem", fontSize:".8rem", fontWeight:600, letterSpacing:".05em", fontFamily:"'DM Sans',sans-serif", cursor:disabled?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:".45rem" }}>
      {children}
    </motion.button>
  );
}

function GhostBtn({ onClick, children, danger=false }) {
  const [h,setH]=useState(false);
  return (
    <motion.button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} whileTap={{scale:.97}}
      style={{ flex:1, background:danger&&h?"rgba(244,63,94,.1)":h?"var(--hover)":"var(--card)", border:`1px solid ${danger?(h?"rgba(244,63,94,.4)":"rgba(244,63,94,.2)"):"var(--border)"}`, color:danger?"var(--rose)":h?"var(--text)":"var(--text2)", borderRadius:8, padding:".72rem 1rem", fontSize:".8rem", fontFamily:"'DM Sans',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:".45rem", transition:"all .2s" }}>
      {children}
    </motion.button>
  );
}

// ─── AvatarPicker ─────────────────────────────────────────────────────────────
function AvatarPicker({ src, initials, uploading, onChange }) {
  return (
    <div style={{ position:"relative", flexShrink:0 }}>
      {/* Circle */}
      <div style={{ width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg,var(--gold),var(--gold2))", border:`3px solid ${uploading?"var(--gold)":"rgba(200,169,110,.4)"}`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", color:"var(--bg)", fontSize:"1.75rem", fontWeight:700, position:"relative", transition:"border-color .3s" }}>
        {src
          ? <img src={src} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center" }}
              onError={e => { e.target.style.display="none"; e.target.nextSibling && (e.target.nextSibling.style.display="flex"); }}/>
          : initials
        }
        {/* Spinner while uploading */}
        {uploading && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:28, height:28, border:"3px solid rgba(200,169,110,.3)", borderTopColor:"var(--gold)", borderRadius:"50%", animation:"ss-spin .7s linear infinite" }}/>
          </div>
        )}
      </div>

      {/* Camera badge */}
      <label style={{ position:"absolute", bottom:0, right:0, width:28, height:28, borderRadius:"50%", background:uploading?"var(--gold)":"var(--bg2)", border:"2px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:uploading?"not-allowed":"pointer", color:uploading?"var(--bg)":"var(--gold)", boxShadow:"0 2px 8px rgba(0,0,0,.35)", transition:"all .2s" }}>
        <Camera size={12}/>
        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display:"none" }} onChange={onChange} disabled={uploading}/>
      </label>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { t }                    = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [editing,    setEditing]    = useState(false);
  const [pwdOpen,    setPwdOpen]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [avatarSrc,  setAvatarSrc]  = useState(buildAvatarUrl(user?.avatar));
  const [showPwd,    setShowPwd]    = useState({ current:false, new:false, confirm:false });

  const [form, setForm] = useState({
    name:       user?.name       || "",
    city:       user?.city       || "",
    gender:     user?.gender     || "",
    ageGroup:   user?.ageGroup   || "",
    profession: user?.profession || "",
    budgetMin:  user?.budgetMin  || 0,
    budgetMax:  user?.budgetMax  || 100000,
  });

  const [prefs, setPrefs] = useState(user?.preferences || {
    emailNotifications:true, smsNotifications:true, whatsappNotifs:false,
    pushNotifications:true, priceDropAlerts:true, trendAlerts:true, weeklyDigest:false,
  });

  const [pwdForm, setPwdForm] = useState({ currentPassword:"", newPassword:"", confirmPassword:"" });

  const setF = (k,v) => setForm(p=>({...p,[k]:v}));
  const budgetLabel = BUDGETS.find(b=>b.max===form.budgetMax)?.label || "Custom";

  // ── Compress image to max 300px / 70% quality before upload ─────────────
  const compressImage = (file) => new Promise((resolve, reject) => {
    const img    = document.createElement("img");
    const reader = new FileReader();

    reader.onload = (ev) => {
      img.onload = () => {
        const MAX   = 300;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
          "image/jpeg",
          0.75                          // 75% quality — good balance size/quality
        );
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Instant local preview — user sees change immediately
    const preview = URL.createObjectURL(file);
    setAvatarSrc(preview);
    setUploading(true);

    try {
      // Compress before upload (2.6MB → ~30KB)
      const compressed = await compressImage(file);

      const fd = new FormData();
      fd.append("avatar", compressed, "avatar.jpg");

      const { data } = await userService.uploadAvatar(fd);

      // Build absolute URL + cache-bust so browser doesn't show old image
      const fullUrl = buildAvatarUrl(data.avatar) + `?t=${Date.now()}`;

      // Update local avatar display
      setAvatarSrc(fullUrl);

      // Sync to AuthContext → sidebar user card + topbar avatar update instantly
      // AuthContext.updateUser does: setUser(prev => ({ ...prev, ...updates }))
      updateUser({ avatar: fullUrl });

      toast.success("Profile picture updated! 🎉");
    } catch (err) {
      // Revert preview on any error
      setAvatarSrc(buildAvatarUrl(user?.avatar));
      toast.error(err?.response?.data?.message || "Upload failed — please try again");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(preview);  // free memory
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  // ── Save profile ──────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await userService.updateProfile({ ...form, preferences:prefs });
      updateUser(data.user);
      setEditing(false);
      toast.success("Profile saved ✅");
    } catch (err) {
      toast.error(err?.response?.data?.message || t("common.error"));
    } finally { setSaving(false); }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const changePassword = async () => {
    if (!pwdForm.currentPassword) { toast.error("Enter current password"); return; }
    if (pwdForm.newPassword.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast.error("Passwords don't match"); return; }
    try {
      await authService.changePassword({ currentPassword:pwdForm.currentPassword, newPassword:pwdForm.newPassword });
      toast.success("Password changed successfully!");
      setPwdOpen(false);
      setPwdForm({ currentPassword:"", newPassword:"", confirmPassword:"" });
    } catch (err) { toast.error(err?.response?.data?.message || t("common.error")); }
  };

  // ── Toggle notification pref (auto-saves) ─────────────────────────────────
  const togglePref = (key) => {
    const next = { ...prefs, [key]:!prefs[key] };
    setPrefs(next);
    userService.updateProfile({ preferences:next }).catch(() => {});
  };

  const initials = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <div style={{ padding:"2rem 2.5rem", maxWidth:900, margin:"0 auto", fontFamily:"'DM Sans',sans-serif" }}>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:.6, ease:[.16,1,.3,1] }}
        style={{ borderRadius:20, padding:"2rem 2.5rem", marginBottom:"1.75rem", position:"relative", overflow:"hidden", background:"linear-gradient(135deg,#1a1410 0%,#2a1f0a 50%,#1a1410 100%)", border:"1px solid var(--border2)" }}>

        {/* Glow orbs */}
        <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:"var(--gold)", opacity:.07, filter:"blur(60px)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-40, left:-40, width:160, height:160, borderRadius:"50%", background:"var(--gold)", opacity:.05, filter:"blur(40px)", pointerEvents:"none" }}/>

        <div style={{ display:"flex", alignItems:"center", gap:"1.5rem", flexWrap:"wrap", position:"relative", zIndex:1 }}>

          {/* ── AVATAR PICKER ── */}
          <AvatarPicker
            src={avatarSrc}
            initials={initials}
            uploading={uploading}
            onChange={handleAvatarUpload}
          />

          {/* Name + tags */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.6rem", color:"var(--gold)", lineHeight:1.1, marginBottom:".3rem" }}>
              {user?.name || "User"}
            </div>
            <div style={{ fontSize:".85rem", color:"rgba(200,169,110,.6)", marginBottom:".75rem" }}>
              {user?.email || user?.phone || ""}
            </div>
            <div style={{ display:"flex", gap:".5rem", flexWrap:"wrap" }}>
              {[user?.profession, user?.ageGroup?.replace("_","–"), user?.city ? `📍 ${user.city}` : null]
                .filter(Boolean)
                .map((tag,i) => (
                  <span key={i} style={{ background:"rgba(200,169,110,.1)", border:"1px solid rgba(200,169,110,.2)", color:"rgba(200,169,110,.8)", fontSize:".72rem", padding:".3rem .75rem", borderRadius:100, letterSpacing:".04em" }}>
                    {tag}
                  </span>
                ))
              }
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:"flex", gap:".625rem" }}>
            {[["❤️","Saved","12"],["🔔","Alerts","4"],["💰","Saved","₹31k"]].map(([icon,label,val])=>(
              <div key={label+val} style={{ textAlign:"center", background:"rgba(255,255,255,.08)", borderRadius:10, padding:".6rem .875rem" }}>
                <div style={{ fontSize:"1rem" }}>{icon}</div>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:".95rem", color:"#fff", fontWeight:700 }}>{val}</div>
                <div style={{ fontSize:".58rem", color:"rgba(255,255,255,.5)", letterSpacing:".06em", textTransform:"uppercase" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Edit toggle */}
          <motion.button onClick={() => setEditing(e=>!e)} whileHover={{ background:"rgba(200,169,110,.2)" }} whileTap={{ scale:.96 }}
            style={{ background:"rgba(200,169,110,.12)", border:"1px solid rgba(200,169,110,.3)", color:"var(--gold)", fontSize:".78rem", fontWeight:600, padding:".65rem 1.25rem", borderRadius:10, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:".04em", display:"flex", alignItems:"center", gap:".5rem", flexShrink:0 }}>
            {editing ? `✕ ${t("profile.cancel")}` : `✏️ ${t("profile.editProfile")}`}
          </motion.button>
        </div>

        {/* Upload hint */}
        {uploading && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            style={{ marginTop:"1rem", fontSize:".78rem", color:"rgba(200,169,110,.7)", display:"flex", alignItems:"center", gap:".5rem", position:"relative", zIndex:1 }}>
            <div style={{ width:10, height:10, border:"2px solid rgba(200,169,110,.3)", borderTopColor:"var(--gold)", borderRadius:"50%", animation:"ss-spin .7s linear infinite" }}/>
            Uploading photo...
          </motion.div>
        )}
      </motion.div>

      {/* ── GRID ──────────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>

        {/* LEFT — Profile info */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }}>
          <Card>
            <CardTitle icon="👤" text={t("profile.info")}/>

            {[
              { label:t("profile.fullName"), key:"name", placeholder:"Your name" },
              { label:t("profile.city"),     key:"city", placeholder:"Your city" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:"1rem" }}>
                <FieldLabel>{f.label}</FieldLabel>
                {editing
                  ? <TextInput value={form[f.key]} onChange={e=>setF(f.key,e.target.value)} placeholder={f.placeholder}/>
                  : <ReadValue>{form[f.key]}</ReadValue>
                }
              </div>
            ))}

            {/* Gender */}
            <div style={{ marginBottom:"1rem" }}>
              <FieldLabel>{t("profile.gender")}</FieldLabel>
              {editing ? (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".5rem" }}>
                  {GENDERS.map(g=>(
                    <motion.button key={g.value} onClick={()=>setF("gender",g.value)} whileTap={{ scale:.96 }}
                      style={{ padding:".6rem", fontSize:".78rem", fontFamily:"'DM Sans',sans-serif", background:form.gender===g.value?"var(--active2)":"var(--card)", border:`1px solid ${form.gender===g.value?"var(--border2)":"var(--border)"}`, color:form.gender===g.value?"var(--gold)":"var(--text2)", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:".35rem", transition:"all .2s" }}>
                      {g.icon} {t(g.labelKey)}
                      {form.gender===g.value && <Check size={11} style={{ color:"var(--gold)" }}/>}
                    </motion.button>
                  ))}
                </div>
              ) : (
                <ReadValue>
                  {form.gender ? `${GENDERS.find(g=>g.value===form.gender)?.icon} ${t(GENDERS.find(g=>g.value===form.gender)?.labelKey||"")}` : null}
                </ReadValue>
              )}
            </div>

            {/* Age Group */}
            <div style={{ marginBottom:"1rem" }}>
              <FieldLabel>{t("profile.ageGroup")}</FieldLabel>
              {editing ? (
                <SelectInput value={form.ageGroup} onChange={e=>setF("ageGroup",e.target.value)}>
                  <option value="">Select...</option>
                  {AGE_GROUPS.map(a=><option key={a} value={a} style={{ background:"var(--bg2)" }}>{a.replace("_","–")}</option>)}
                </SelectInput>
              ) : <ReadValue>{form.ageGroup?.replace("_","–")}</ReadValue>}
            </div>

            {/* Profession */}
            <div style={{ marginBottom:"1rem" }}>
              <FieldLabel>{t("profile.profession")}</FieldLabel>
              {editing ? (
                <SelectInput value={form.profession} onChange={e=>setF("profession",e.target.value)}>
                  <option value="">Select...</option>
                  {PROFESSIONS.map(p=><option key={p} value={p} style={{ background:"var(--bg2)" }}>{p}</option>)}
                </SelectInput>
              ) : <ReadValue>{form.profession}</ReadValue>}
            </div>

            {/* Budget */}
            <div style={{ marginBottom: editing ? "1.25rem" : 0 }}>
              <FieldLabel>{t("profile.budget")}</FieldLabel>
              {editing ? (
                <SelectInput value={form.budgetMax} onChange={e=>{
                  const b=BUDGETS.find(b=>b.max===Number(e.target.value));
                  setF("budgetMax",b?.max||100000); setF("budgetMin",b?.min||0);
                }}>
                  {BUDGETS.map(b=><option key={b.max} value={b.max} style={{ background:"var(--bg2)" }}>{b.label}</option>)}
                </SelectInput>
              ) : <ReadValue>{budgetLabel}</ReadValue>}
            </div>

            <AnimatePresence>
              {editing && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}>
                  <div style={{ display:"flex", gap:".625rem" }}>
                    <GoldBtn onClick={saveProfile} disabled={saving}>
                      <Save size={14}/> {saving ? t("profile.saving") : t("profile.saveChanges")}
                    </GoldBtn>
                    <GhostBtn onClick={()=>setEditing(false)}>{t("profile.cancel")}</GhostBtn>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* RIGHT COLUMN */}
        <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>

          {/* Password */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.15 }}>
            <Card>
              <CardTitle icon="🔐" text={t("profile.changePwd")}/>
              <AnimatePresence mode="wait">
                {!pwdOpen ? (
                  <motion.div key="closed" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                    <GhostBtn onClick={()=>setPwdOpen(true)}>
                      <Shield size={14}/> {t("profile.changeBtn")}
                    </GhostBtn>
                  </motion.div>
                ) : (
                  <motion.div key="open" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
                    <PwdField label={t("profile.currentPwd")} value={pwdForm.currentPassword} onChange={e=>setPwdForm(p=>({...p,currentPassword:e.target.value}))} show={showPwd.current} onToggle={()=>setShowPwd(p=>({...p,current:!p.current}))}/>
                    <PwdField label={t("profile.newPwd")}     value={pwdForm.newPassword}     onChange={e=>setPwdForm(p=>({...p,newPassword:e.target.value}))}     show={showPwd.new}     onToggle={()=>setShowPwd(p=>({...p,new:!p.new}))}/>
                    <PwdField label={t("profile.confirmPwd")} value={pwdForm.confirmPassword} onChange={e=>setPwdForm(p=>({...p,confirmPassword:e.target.value}))} show={showPwd.confirm} onToggle={()=>setShowPwd(p=>({...p,confirm:!p.confirm}))}/>
                    <div style={{ display:"flex", gap:".625rem" }}>
                      <GoldBtn onClick={changePassword}><Check size={14}/> {t("profile.updatePwd")}</GoldBtn>
                      <GhostBtn onClick={()=>setPwdOpen(false)}>{t("profile.cancel")}</GhostBtn>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2 }}>
            <Card>
              <CardTitle icon="🔔" text={t("profile.notifPrefs")}/>
              {NOTIF_PREFS.map((pref,i)=>(
                <div key={pref.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:".75rem 0", borderBottom:i<NOTIF_PREFS.length-1?"1px solid var(--border)":"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:".625rem" }}>
                    <span>{pref.icon}</span>
                    <div>
                      <div style={{ fontSize:".82rem", color:"var(--text)", fontWeight:500 }}>{t(pref.labelKey)}</div>
                      <div style={{ fontSize:".68rem", color:prefs[pref.key]?"#10b981":"var(--text3)", marginTop:".1rem" }}>
                        {prefs[pref.key] ? t("notifications.active","✅ Active") : t("notifications.paused","⛔ Paused")}
                      </div>
                    </div>
                  </div>
                  <Toggle checked={prefs[pref.key]} onChange={()=>togglePref(pref.key)}/>
                </div>
              ))}
            </Card>
          </motion.div>

          {/* Danger zone */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.25 }}>
            <Card danger>
              <CardTitle icon="⚠️" text={t("profile.dangerZone")}/>
              <p style={{ fontSize:".8rem", color:"var(--text3)", marginBottom:"1rem", lineHeight:1.7 }}>
                Deleting your account is permanent and cannot be undone. All data, favorites, and alerts will be removed.
              </p>
              <GhostBtn danger onClick={()=>{
                if (window.confirm(t("profile.deleteConfirm"))) {
                  userService.deleteAccount().then(() => {
  logout();
  navigate("/");
});
                }
              }}>
                <AlertTriangle size={14}/> {t("profile.deleteAccount")}
              </GhostBtn>
            </Card>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes ss-spin { to { transform: rotate(360deg); } }
        select option { background: var(--bg2); color: var(--text); }
      `}</style>
    </div>
  );
}
