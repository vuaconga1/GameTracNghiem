/* eslint-disable @next/next/no-img-element */

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/wewinlogo.png" alt="WeWIN Education" />
          <h2>WeWIN Education</h2>
          <p>WEWIN BỨT PHÁ TIẾNG ANH – VƯƠN TẦM THẾ GIỚI 🌏</p>
          <div className="footer-social">
            <a
              className="footer-social-link"
              href="https://wewin.edu.vn"
              target="_blank"
              rel="noopener noreferrer"
              title="Website"
            >
              <img src="https://img.icons8.com/fluency/48/domain.png" alt="Website" />
            </a>
            <a
              className="footer-social-link"
              href="https://www.facebook.com/winwineducation"
              target="_blank"
              rel="noopener noreferrer"
              title="Facebook"
            >
              <img src="https://img.icons8.com/color/48/facebook-new.png" alt="Facebook" />
            </a>
            <a
              className="footer-social-link"
              href="https://www.tiktok.com/@wewin.education.vn"
              target="_blank"
              rel="noopener noreferrer"
              title="TikTok"
            >
              <img src="https://img.icons8.com/color/48/tiktok--v1.png" alt="TikTok" />
            </a>
            <a
              className="footer-social-link"
              href="https://www.youtube.com/@wewin.education"
              target="_blank"
              rel="noopener noreferrer"
              title="YouTube"
            >
              <img src="https://img.icons8.com/color/48/youtube-play.png" alt="YouTube" />
            </a>
            <a className="footer-social-link" href="mailto:officemanager@wewin.edu.vn" title="Email">
              <img src="https://img.icons8.com/color/48/gmail--v1.png" alt="Gmail" />
            </a>
          </div>
        </div>

        <div className="footer-contact">
          <h3>
            <i className="fas fa-map-marker-alt" /> Thông tin liên hệ
          </h3>
          <div className="footer-contact-grid">
            <div className="footer-contact-card">
              <div className="card-label">
                <i className="fas fa-map-marker-alt" /> Địa chỉ
              </div>
              <p>292B Nơ Trang Long, P.12, Bình Thạnh, TP.HCM</p>
            </div>
            <div className="footer-contact-card">
              <div className="card-label">
                <i className="fas fa-phone" /> Điện thoại
              </div>
              <p>
                <a href="tel:0345969388">0345 969 388</a>
              </p>
            </div>
            <div className="footer-contact-card">
              <div className="card-label">
                <i className="fas fa-envelope" /> Email
              </div>
              <p>
                <a href="mailto:officemanager@wewin.edu.vn">officemanager@wewin.edu.vn</a>
              </p>
            </div>
            <div className="footer-contact-card">
              <div className="card-label">
                <i className="fas fa-globe" /> Website
              </div>
              <p>
                <a href="https://wewin.edu.vn" target="_blank" rel="noopener noreferrer">
                  wewin.edu.vn
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="footer-divider" />
      <p className="footer-copy">
        © 2026 <strong>WeWIN Education</strong>. All rights reserved. Made with ❤️
      </p>
    </footer>
  );
}
