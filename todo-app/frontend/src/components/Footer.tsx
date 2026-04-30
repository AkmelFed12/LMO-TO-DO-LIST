import './Footer.css';

const Footer = () => {
  return (
    <>
      <a
        className="whatsapp-fab"
        href="https://wa.me/?text=Hello%20LMO%20team%2C%20I%20need%20support."
        target="_blank"
        rel="noreferrer"
        aria-label="Contact support on WhatsApp"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M20 12a8 8 0 0 1-11.7 7l-4.3 1.2 1.3-4.1A8 8 0 1 1 20 12Z" fill="currentColor" />
          <path d="M15.5 13.6c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1l-.4.5c-.1.2-.3.2-.5.1-.8-.4-1.4-1-1.9-1.8-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.3 0-.4l-.7-1.6c-.1-.2-.3-.2-.4-.2h-.4c-.2 0-.4.1-.6.3-.6.6-.7 1.5-.2 2.4 1.1 2.2 2.8 3.9 5 5 .8.4 1.8.3 2.4-.3.2-.2.4-.5.3-.8v-.3c0-.2-.1-.3-.3-.4Z" fill="#fff" />
        </svg>
      </a>
      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-text">© 2026 LMO To-Do List. All rights reserved.</p>
          <p className="footer-signature">Designed and built by LMO Website Services</p>
        </div>
      </footer>
    </>
  );
};

export default Footer;
