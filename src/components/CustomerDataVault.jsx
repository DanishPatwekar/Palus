import { useState } from "react";

export default function CustomerDataVault({
  status,
  error,
  legacyCount,
  onUnlock,
  onImport,
  onMigrate,
  onBackup,
  onCancel,
}) {
  const [file, setFile] = useState(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const isLocked = status === "locked";
  const isLegacy = status === "legacy";
  const isManaging = status === "ready";

  const handleUnlock = event => {
    event.preventDefault();
    onUnlock(passphrase);
  };

  const handleImport = event => {
    event.preventDefault();
    onImport(file, passphrase, confirmation);
  };

  const handleMigration = () => onMigrate(passphrase, confirmation);

  return (
    <main className="vault-page min-h-screen flex items-center justify-center px-5 py-10">
      <section className="vault-card">
        <div className="vault-brand brand-lockup">
          <span className="brand-symbol">P</span>
          <span>PALUS <small>COLLECTIONS</small></span>
        </div>
        <span className="eyebrow">LOCAL CUSTOMER VAULT</span>
        <h1>{isLocked ? "Unlock customer data" : isManaging ? "Manage customer data" : isLegacy ? "Protect saved customer data" : "Import customer data"}</h1>
        <p className="vault-description">
          {isLocked
            ? "Enter the passphrase used when this customer file was encrypted."
            : isLegacy
              ? `There are ${legacyCount.toLocaleString("en-IN")} records in the old unencrypted browser cache. Encrypt them now, or import a JSON file instead.`
              : isManaging
                ? "Import updated customer data or restore an encrypted backup. Importing replaces the records on this browser."
                : "Choose a customer JSON file and set a strong passphrase to encrypt it on this device."}
        </p>

        {error && <p className="vault-error" role="alert">{error}</p>}

        {isLocked ? (
          <form className="vault-form" onSubmit={handleUnlock}>
            <label htmlFor="vault-passphrase">Passphrase</label>
            <input id="vault-passphrase" type="password" autoComplete="current-password" value={passphrase} onChange={event => setPassphrase(event.target.value)} required autoFocus />
            <button className="primary-button vault-submit" type="submit">Unlock customer data <span aria-hidden="true">→</span></button>
          </form>
        ) : (
          <div className="vault-import-area">
            <form className="vault-form" onSubmit={handleImport}>
              <label htmlFor="customer-json">Customer JSON file</label>
              <input id="customer-json" className="vault-file-input" type="file" accept=".json,application/json" onChange={event => setFile(event.target.files?.[0] || null)} required />
              <label htmlFor="new-vault-passphrase">{isManaging ? "Passphrase" : "New passphrase"}</label>
              <input id="new-vault-passphrase" type="password" autoComplete="new-password" minLength={12} value={passphrase} onChange={event => setPassphrase(event.target.value)} required />
              <label htmlFor="confirm-vault-passphrase">{isManaging ? "Confirm passphrase" : "Confirm new passphrase"}</label>
              <input id="confirm-vault-passphrase" type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={event => setConfirmation(event.target.value)} required />
              <button className="primary-button vault-submit" type="submit">Encrypt and open data <span aria-hidden="true">→</span></button>
            </form>
            {isManaging && (
              <>
                <button className="secondary-vault-button" type="button" onClick={onBackup}>Download encrypted backup</button>
                <p className="vault-format-hint">After downloading, manually replace or delete the original plaintext JSON file in your project. The browser cannot overwrite that file for you.</p>
              </>
            )}
            {isLegacy && (
              <button className="secondary-vault-button" type="button" onClick={handleMigration} disabled={!passphrase || !confirmation}>
                Encrypt the {legacyCount.toLocaleString("en-IN")} saved records instead
              </button>
            )}
          </div>
        )}

        {onCancel && <button className="vault-cancel" type="button" onClick={onCancel}>Cancel</button>}
        <div className="vault-security-note">
          <strong>Encrypted on this device</strong>
          <span>Records are encrypted with AES-GCM before they are saved. The passphrase is not stored. This browser does not sync data to other devices.</span>
        </div>
        {!isLocked && <p className="vault-format-hint">JSON format: an array of objects with <code>name</code>, <code>mobile</code>, and <code>dibba</code> fields. Keep mobile numbers as strings to preserve leading zeros.</p>}
      </section>
    </main>
  );
}