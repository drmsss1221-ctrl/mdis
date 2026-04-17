/**
 * scroll-tracker.js
 * Isolated additive module for scroll-based section tracking.
 * Maps navigation links to their corresponding section blocks via IntersectionObserver.
 */

const initScrollTracker = () => {
  // Find all internal navigation anchor links
  const navLinks = document.querySelectorAll('a[href^="#"]');
  if (!navLinks.length) return;

  const sections = [];
  const linkMap = new Map();

  // Map each link to its target section ID
  navLinks.forEach(link => {
    const targetId = link.getAttribute('href');
    if (targetId && targetId.length > 1) { // Ignore plain '#'
      const section = document.querySelector(targetId);
      if (section) {
        if (!linkMap.has(section)) {
          sections.push(section);
          linkMap.set(section, []);
        }
        linkMap.get(section).push(link);
      }
    }
  });

  if (!sections.length) return;

  // Intersection Observer to detect the most visible section
  // Offsets bias to detect elements entering the top-middle third of the viewport
  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -40% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    const intersecting = entries.filter(entry => entry.isIntersecting);
    if (!intersecting.length) return;

    // Strip .active globally
    navLinks.forEach(link => link.classList.remove('active'));

    // Apply .active to all links tied to the topmost currently intersecting section
    const activeSection = intersecting[0].target;
    const activeLinks = linkMap.get(activeSection);
    if (activeLinks) {
      activeLinks.forEach(link => link.classList.add('active'));
    }

    // Toggle scroll-based visual focus/defocus effects
    sections.forEach(section => {
      if (section === activeSection) {
        section.classList.add('section-active');
        section.classList.remove('section-inactive');
      } else {
        section.classList.add('section-inactive');
        section.classList.remove('section-active');
      }
    });
  }, observerOptions);

  // Bind observer to all mapped sections
  sections.forEach(section => observer.observe(section));

  // --- SUBTLE SCROLL-RESPONSIVE BACKGROUND ---
  let scrollTicking = false;
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--scroll-offset', window.scrollY + 'px');
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollTracker);
} else {
  initScrollTracker();
}
