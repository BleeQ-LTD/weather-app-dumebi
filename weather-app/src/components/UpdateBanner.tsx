import { useAppUpdate } from "../hooks/useAppUpdate.ts";
import { useUpdateNotice } from "../hooks/useUpdateNotice";

function UpdateBanner() {
  const newVersion = useAppUpdate();
  const { notice, dismiss, reload } = useUpdateNotice();

  if (!newVersion && !notice) return null;

  return (
    <div className="update-banner" role="status">
      <span>{notice?.message ?? "A new version is available."}</span>
      <button type="button" onClick={reload}>
        Reload
      </button>
      {notice && (
        <button type="button" onClick={dismiss}>
          Later
        </button>
      )}
    </div>
  );
}

export default UpdateBanner;