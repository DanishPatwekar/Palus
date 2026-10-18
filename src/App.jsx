import { useState } from "react";
import useCustomers from "./Data/useCustomers";
import CustomerDataVault from "./components/CustomerDataVault";
import "./App.css";

const navigation = [
  { id: "overview", label: "Overview", mark: "OV" },
  { id: "send", label: "Send message", mark: "SM" },
  { id: "customers", label: "Customers", mark: "CU" },
];
const currentDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date()).toUpperCase();

function App() {
  const {
    customers,
    status,
    error,
    legacyCount,
    unlock,
    importJsonFile,
    encryptLegacyCustomers,
    downloadEncryptedBackup,
    lock,
    clearError,
  } = useCustomers();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [activePage, setActivePage] = useState("overview");
  const [searchType, setSearchType] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [manageCustomerData, setManageCustomerData] = useState(false);

  const searchCustomers = () => {
    setSearchQuery(searchInput.trim().toLocaleLowerCase());
    setSelectedCustomer(null);
    setAmount("");
    setFormError("");
  };

  const results = searchQuery
    ? customers.filter(customer => {
      const fields = searchType === "all"
        ? [customer.name, customer.mobile, customer.dibba]
        : [customer[searchType]];
      return fields.some(value => String(value || "").toLocaleLowerCase().includes(searchQuery));
    })
    : [];

  const handleLogin = event => {
    event.preventDefault();
    if (userId === "786" && password === "313") {
      setIsLoggedIn(true);
      setLoginError("");
      return;
    }
    setLoginError("That user ID or password is not correct.");
  };

  const sendWhatsAppMessage = () => {
    const numericAmount = Number(amount);
    const mobile = String(selectedCustomer?.mobile || "").replace(/\D/g, "");
    if (!selectedCustomer || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    if (!mobile) {
      setFormError("This customer does not have a valid mobile number.");
      return;
    }

    const normalizedMobile = mobile.length === 11 && mobile.startsWith("0") ? mobile.slice(1) : mobile;
    const whatsappMobile = normalizedMobile.length === 10 ? `91${normalizedMobile}` : normalizedMobile;
    const formattedAmount = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(numericAmount);
    const message = `अस्सलामु अलैकुम, ${selectedCustomer.name}
  आपके डिब्बा नंबर ${selectedCustomer.dibba} से
  *${formattedAmount} ₹* मदरसा हज़रत अली बिन अबी तालिब, पलुस में जमा हुए।

  *रसूलुल्लाह ﷺ ने फरमाया*:
  "*सदका गुनाहों को ऐसे बुझा देता है जैसे पानी आग को बुझा देता है।*" (इब्न माजा)`;
    window.open(`https://wa.me/${whatsappMobile}?text=${encodeURIComponent(message)}`, "_blank");
    setFormError("");
  };

  if (!isLoggedIn) {
    return (
      <main className="login-page min-h-screen flex items-center justify-center px-5 py-10">
        <div className="login-wrap grid">
          <section className="login-aside">
            <div className="brand-lockup">
              <span className="brand-symbol">P</span>
              <span>PALUS <small>COLLECTIONS</small></span>
            </div>
            <div className="login-note">
              <span className="eyebrow">CUSTOMER CARE DESK</span>
              <h1>Every payment,<br />a personal touch.</h1>
              <p>Find a customer, confirm the amount received, and follow up in one simple place.</p>
            </div>
            <div className="aside-foot"><span className="status-dot" /> Customer operations portal</div>
          </section>
          <section className="login-main">
            <div className="mobile-brand brand-lockup">
              <span className="brand-symbol">P</span>
              <span>PALUS <small>COLLECTIONS</small></span>
            </div>
            <div className="login-form-wrap">
              <span className="eyebrow">WELCOME BACK</span>
              <h2>Sign in to continue</h2>
              <p className="muted">Use your staff credentials to access the dashboard.</p>
              <form className="login-form" onSubmit={handleLogin}>
                <label htmlFor="user-id">User ID</label>
                <input id="user-id" autoComplete="username" inputMode="numeric" value={userId} onChange={event => setUserId(event.target.value)} placeholder="Enter your user ID" />
                <label htmlFor="password">Password</label>
                <div className="password-control">
                  <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" />
                  <button type="button" className="text-button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
                </div>
                {loginError && <p className="form-error" role="alert">{loginError}</p>}
                <button className="primary-button login-button" type="submit">Sign in <span aria-hidden="true">→</span></button>
              </form>
              <p className="login-footnote">Authorized staff access only</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (status !== "ready" || manageCustomerData) {
    return (
      <CustomerDataVault
        status={status}
        error={error}
        legacyCount={legacyCount}
        onUnlock={unlock}
        onImport={importJsonFile}
        onMigrate={encryptLegacyCustomers}
        onBackup={downloadEncryptedBackup}
        onCancel={status === "ready" ? () => { setManageCustomerData(false); clearError(); } : undefined}
      />
    );
  }

  const activeLabel = navigation.find(item => item.id === activePage)?.label || "Overview";

  return (
    <main className="dashboard-shell min-h-screen flex">
      <aside className="sidebar">
        <div className="brand-lockup sidebar-brand">
          <span className="brand-symbol">P</span>
          <span>PALUS <small>COLLECTIONS</small></span>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-navigation" aria-label="Main navigation">
          {navigation.map(item => (
            <button key={item.id} className={`nav-item ${activePage === item.id ? "active" : ""}`} onClick={() => setActivePage(item.id)}>
              <span className="nav-mark">{item.mark}</span><span>{item.label}</span>
              {item.id === "send" && <span className="nav-arrow">›</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sheet-status"><span className="status-dot" /><span>Encrypted customer data unlocked</span></div>
          <button className="signout-button" onClick={() => { lock(); setIsLoggedIn(false); setPassword(""); }}>Sign out <span aria-hidden="true">↗</span></button>
        </div>
      </aside>

      <section className="main-column">
        <header className="topbar flex items-center justify-between">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-divider">/</span><strong>{activeLabel}</strong></div>
          <div className="user-chip"><span className="user-avatar">P</span><span><strong>Staff account</strong><small>Operations</small></span></div>
        </header>
        <div className="page-content">
          {activePage === "overview" && (
            <>
              <div className="page-heading">
                <div><span className="eyebrow">{currentDate}</span><h1>Good to see you.</h1><p className="muted">Your customer follow-up workspace is ready.</p></div>
                <button className="primary-button heading-action" onClick={() => setActivePage("send")}><span aria-hidden="true">＋</span> Send a message</button>
              </div>
              <div className="overview-grid">
                <article className="overview-card customer-count-card">
                  <div className="card-topline"><span className="card-icon">CU</span><span className="card-label">CUSTOMER DIRECTORY</span></div>
                  <div className="stat-number">{customers.length.toLocaleString("en-IN")}</div>
                  <p>customers available to search</p>
                  <div className="card-rule" /><span className="tiny-note">Encrypted on this device</span>
                </article>
                <article className="overview-card action-card">
                  <div className="action-copy"><span className="eyebrow">QUICK ACTION</span><h2>Send a payment update</h2><p>Search by name, mobile, or dibba number and open a ready-to-send WhatsApp message.</p><button className="plain-link" onClick={() => setActivePage("send")}>Start a message <span aria-hidden="true">→</span></button></div>
                  <div className="message-art" aria-hidden="true"><span className="art-line" /><span className="art-bubble">₹</span><span className="art-check">✓</span></div>
                </article>
              </div>
              <section className="recent-section">
                <div className="section-heading"><div><span className="eyebrow">GET STARTED</span><h2>Customer follow-up</h2></div><span className="section-index">01 / 02</span></div>
                <div className="start-row"><span className="start-number">01</span><div><strong>Find the right customer</strong><p>Search with their name, mobile number, or dibba number.</p></div><button aria-label="Open customer search" onClick={() => setActivePage("send")}>→</button></div>
                <div className="start-row"><span className="start-number">02</span><div><strong>Confirm and send</strong><p>Review their details, enter the amount, then open WhatsApp.</p></div><button aria-label="Open customer search" onClick={() => setActivePage("send")}>→</button></div>
              </section>
            </>
          )}

          {activePage === "send" && (
            <>
              <div className="page-heading compact-heading">
                <div><span className="eyebrow">CUSTOMER FOLLOW-UP</span><h1>Send a message</h1><p className="muted">Find a customer and prepare their payment confirmation.</p></div>
              </div>
              <div className="message-layout">
                <section className="workspace-panel search-panel">
                  <div className="panel-heading"><span className="step-count">01</span><div><h2>Find customer</h2><p>Search by name, mobile, or dibba number.</p></div></div>
                  <form className="search-form" onSubmit={event => { event.preventDefault(); searchCustomers(); }}>
                    <label htmlFor="search-type">Search by</label>
                    <select id="search-type" value={searchType} onChange={event => setSearchType(event.target.value)}>
                      <option value="all">Any field</option><option value="name">Name</option><option value="mobile">Mobile number</option><option value="dibba">Dibba number</option>
                    </select>
                    <label htmlFor="customer-search">Search details</label>
                    <div className="search-input-row"><input id="customer-search" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder={searchType === "mobile" ? "e.g. 98765 43210" : searchType === "dibba" ? "Enter dibba number" : "Name, mobile, or dibba number"} /><button className="primary-button search-button" type="submit">Search <span aria-hidden="true">→</span></button></div>
                  </form>
                  <div className="results-heading"><span>{searchQuery ? "MATCHING CUSTOMERS" : "CUSTOMER RESULTS"}</span>{searchQuery && <span>{results.length} found</span>}</div>
                  <div className="results-list">
                    {!searchQuery && <div className="empty-state"><span className="empty-mark">⌕</span><strong>Search the directory</strong><p>Enter a customer name, mobile number, or dibba number above.</p></div>}
                    {searchQuery && results.length === 0 && <div className="empty-state"><span className="empty-mark">—</span><strong>No matches found</strong><p>Try checking the spelling or using another search field.</p></div>}
                    {results.map((customer, index) => (
                      <button key={`${customer.mobile}-${customer.dibba}-${index}`} className={`customer-result ${selectedCustomer === customer ? "selected" : ""}`} onClick={() => { setSelectedCustomer(customer); setAmount(""); setFormError(""); }}>
                        <span className="customer-initial">{customer.name.trim().charAt(0).toUpperCase() || "?"}</span><span className="customer-result-copy"><strong>{customer.name}</strong><small>{customer.mobile || "No mobile number"}</small></span><span className="dibba-tag">Dibba {customer.dibba || "—"}</span><span className="result-chevron">›</span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className={`workspace-panel detail-panel ${selectedCustomer ? "has-selection" : ""}`}>
                  <div className="panel-heading"><span className="step-count">02</span><div><h2>Confirm &amp; send</h2><p>Review customer details before sending.</p></div></div>
                  {!selectedCustomer ? (
                    <div className="detail-placeholder"><span className="placeholder-mark">02</span><p>Select a customer from the search results to see their details here.</p></div>
                  ) : (
                    <>
                      <div className="selected-banner"><span className="customer-initial large-initial">{selectedCustomer.name.trim().charAt(0).toUpperCase() || "?"}</span><div><span className="eyebrow">SELECTED CUSTOMER</span><h3>{selectedCustomer.name}</h3></div><span className="verified-mark">✓</span></div>
                      <dl className="customer-details"><div><dt>Mobile number</dt><dd>{selectedCustomer.mobile || "Not available"}</dd></div><div><dt>Dibba number</dt><dd>{selectedCustomer.dibba || "Not available"}</dd></div></dl>
                      <div className="amount-divider" />
                      <label className="amount-label" htmlFor="amount">Enter amount received</label>
                      <div className="amount-input"><span>₹</span><input id="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" value={amount} onChange={event => setAmount(event.target.value)} /></div>
                      <p className="message-preview-label">MESSAGE PREVIEW</p>
                      <div className="message-preview">
                        अस्सलामु अलैकुम, {selectedCustomer.name}<br />
                        आपके डिब्बा नंबर {selectedCustomer.dibba} से<br />
                        ₹{amount ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(amount) || 0) : "[रक़म]"} मदरसा हज़रत अली बिन अबी तालिब, पलुस में जमा हुए।<br /><br />
                        रसूलुल्लाह ﷺ ने फरमाया:<br />
                        "सदका गुनाहों को ऐसे बुझा देता है जैसे पानी आग को बुझा देता है।" (इब्न माजा)
                      </div>
                      {formError && <p className="form-error" role="alert">{formError}</p>}
                      <button className="whatsapp-button" onClick={sendWhatsAppMessage}><span className="whatsapp-mark">W</span> Open WhatsApp <span aria-hidden="true">↗</span></button>
                      <p className="send-note">WhatsApp opens with the message ready for you to review and send.</p>
                    </>
                  )}
                </section>
              </div>
            </>
          )}

          {activePage === "customers" && (
            <>
              <div className="page-heading compact-heading"><div><span className="eyebrow">DIRECTORY</span><h1>Customers</h1><p className="muted">{customers.length} customer records in your encrypted local directory.</p></div><div className="directory-actions"><button className="secondary-vault-button" onClick={() => setManageCustomerData(true)}>Manage data</button><button className="primary-button heading-action" onClick={() => setActivePage("send")}>Find a customer <span aria-hidden="true">→</span></button></div></div>
              <section className="workspace-panel directory-panel"><div className="directory-head"><span>NAME</span><span>MOBILE NUMBER</span><span>DIBBA NUMBER</span><span /></div>{customers.length ? customers.map((customer, index) => <button className="directory-row" key={`${customer.mobile}-${customer.dibba}-${index}`} onClick={() => { setSelectedCustomer(customer); setActivePage("send"); }}><strong>{customer.name}</strong><span>{customer.mobile || "—"}</span><span>{customer.dibba || "—"}</span><span className="result-chevron">›</span></button>) : <div className="empty-state"><strong>No customer records available</strong><p>Import a customer JSON file to populate this directory.</p></div>}</section>
            </>
          )}
          <footer className="page-footer"><span>PALUS COLLECTIONS</span><span>Customer operations · {new Date().getFullYear()}</span></footer>
        </div>
      </section>
    </main>
  );
}

export default App;
