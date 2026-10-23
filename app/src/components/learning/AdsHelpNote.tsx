import { useState } from "react";

/**
 * Small "Seeing ads?" link under the player. Ads come from YouTube's embedded player and the app can't
 * tell who has YouTube Premium, so the explanation is only shown on request and can be dismissed.
 */
export function AdsHelpNote() {
  const [open, setOpen] = useState(false);

  return (
    <div className="ads-help">
      {open ? (
        <div className="ads-help-note" id="adsHelpNote" role="note">
          <p>
            <strong>Seeing ads?</strong> Videos play through YouTube&apos;s official player, so ads come from YouTube and
            support the creator. YouTube Premium removes them — make sure you&apos;re signed in to YouTube in this browser.
          </p>
          <button type="button" className="ads-help-dismiss" id="btnDismissAdsHelp" onClick={() => setOpen(false)}>
            Dismiss
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="ads-help-link"
          id="btnAdsHelp"
          aria-expanded={false}
          aria-controls="adsHelpNote"
          onClick={() => setOpen(true)}
        >
          Seeing ads?
        </button>
      )}
    </div>
  );
}
