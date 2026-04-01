import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useId, useMemo, useState } from "react";
import { extractJoinCode } from "../../utils/qr";

export function QRCodeScanner({ onCodeDetected }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const scannerId = useId();
  const regionId = useMemo(() => `qr-region-${scannerId.replaceAll(":", "")}`, [scannerId]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const scanner = new Html5QrcodeScanner(
      regionId,
      {
        fps: 10,
        qrbox: { width: 230, height: 230 },
      },
      false
    );

    scanner.render(
      (decodedText) => {
        const extractedCode = extractJoinCode(decodedText);

        if (!extractedCode) {
          setError("QR code was detected but no valid join code was found.");
          return;
        }

        setError("");
        onCodeDetected(extractedCode);
        scanner.clear().catch(() => {});
        setOpen(false);
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [open, regionId, onCodeDetected]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">Join via QR Scan</p>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          {open ? "Close Scanner" : "Open Scanner"}
        </button>
      </div>

      {open ? <div id={regionId} className="mt-3 overflow-hidden rounded-xl" /> : null}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
