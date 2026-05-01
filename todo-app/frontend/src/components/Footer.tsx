import './Footer.css';

const Footer = () => {
  return (
    <>
      <a
        className="whatsapp-fab"
        href="https://wa.me/2250150070083?text=Bonjour%20LMO%20To-Do%20List%2C%20j%27ai%20besoin%20d%20assistance."
        target="_blank"
        rel="noreferrer"
        aria-label="Contacter le support WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
          <path fill="#25D366" d="M16 2c-7.732 0-14 6.268-14 14 0 2.516.664 4.873 1.843 6.941L2 30l6.936-1.676A13.941 13.941 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2z" />
          <path fill="#FFF" d="M22.17 20.077l-1.284.383c-.347.103-.716.02-.975-.218l-.786-.807c-.245-.252-.598-.35-.94-.265-.588.14-1.16.18-1.72.12-1.05-.12-2.048-.697-2.721-1.548-.54-.68-.812-1.477-.79-2.295.056-1.105.682-2.18 1.591-2.756.22-.136.323-.41.244-.65l-.473-1.51c-.092-.293-.37-.487-.687-.487-.062 0-.12.006-.179.02-1.022.22-1.975.887-2.643 1.83-.91 1.27-1.22 2.82-.842 4.28.28 1.17.964 2.24 1.935 2.97 1.252.948 2.932 1.34 4.548 1.09.269-.04.538.078.705.305l.994 1.33c.252.338.66.48 1.043.364l1.68-.504c.414-.124.65-.558.556-.986-.226-.96-.857-1.77-1.75-2.24z" />
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
