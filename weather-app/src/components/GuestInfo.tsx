interface GuestInfoProps {
  onRequestSignIn: () => void;
}

function GuestInfo({ onRequestSignIn }: GuestInfoProps) {
  return (
    <section className="guest-card">
      <h2 className="sidebar-title">Guest mode</h2>
      <p className="small">
        You're browsing as a guest. You can search any city and see the full forecast, but favourite
        locations can't be saved.
      </p>
      <button type="button" className="btn btn-primary" onClick={onRequestSignIn}>
        Sign in or sign up
      </button>
    </section>
  );
}

export default GuestInfo;
