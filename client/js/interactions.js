/**
 * interactions.js — Buttery smooth cursor-driven animations
 *
 * Effects:
 *  1. 3D card tilt — grid cards tilt toward cursor on hover
 *  2. Dynamic shadows — hard shadows shift with cursor position
 *  3. Magnetic buttons — buttons subtly pull toward cursor
 *  4. Cursor spotlight — soft radial glow follows cursor on cards
 */

(() => {
    'use strict';

    // ── Config ─────────────────────────────────────────────
    const TILT_MAX = 4;          // degrees
    const SHADOW_SHIFT = 6;      // px max shadow offset shift
    const MAGNETIC_PULL = 6;     // px max button displacement
    const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
    const DURATION = '400ms';

    // ── Tilt cards ─────────────────────────────────────────
    const tiltTargets = [
        '.overview-card',
        '.price-table-card',
        '#map-container',
        '#savings-section > div'   // savings card (inline-styled)
    ];

    function initTilt() {
        tiltTargets.forEach(sel => {
            document.querySelectorAll(sel).forEach(card => {
                card.style.transition = `transform ${DURATION} ${EASE}, box-shadow ${DURATION} ${EASE}`;
                card.style.willChange = 'transform, box-shadow';

                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;   // 0..1
                    const y = (e.clientY - rect.top) / rect.height;   // 0..1

                    const tiltX = (0.5 - y) * TILT_MAX;   // pitch
                    const tiltY = (x - 0.5) * TILT_MAX;   // yaw

                    // Dynamic shadow — shifts opposite to tilt
                    const shadowX = 8 - (x - 0.5) * SHADOW_SHIFT;
                    const shadowY = 8 - (y - 0.5) * SHADOW_SHIFT;

                    card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
                    card.style.boxShadow = `${shadowX}px ${shadowY}px 0px 0px #000`;
                });

                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
                    card.style.boxShadow = '';  // revert to CSS default
                });

                // Spotlight glow overlay
                const glow = document.createElement('div');
                glow.className = 'cursor-glow';
                glow.style.cssText = `
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity ${DURATION} ${EASE};
          z-index: 2;
          border-radius: inherit;
        `;
                if (getComputedStyle(card).position === 'static') {
                    card.style.position = 'relative';
                }
                card.style.overflow = 'hidden';
                card.appendChild(glow);

                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    glow.style.background = `radial-gradient(circle 200px at ${x}px ${y}px, rgba(10, 173, 10, 0.08), transparent)`;
                    glow.style.opacity = '1';
                });

                card.addEventListener('mouseleave', () => {
                    glow.style.opacity = '0';
                });
            });
        });
    }

    // ── Magnetic buttons ───────────────────────────────────
    function initMagnetic() {
        const btns = document.querySelectorAll('.compare-btn, .header-badge, .neo-sticker');

        btns.forEach(btn => {
            btn.style.transition = `transform ${DURATION} ${EASE}`;

            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = (e.clientX - cx) / (rect.width / 2) * MAGNETIC_PULL;
                const dy = (e.clientY - cy) / (rect.height / 2) * MAGNETIC_PULL;
                btn.style.transform = `translate(${dx}px, ${dy}px)`;
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
            });
        });
    }

    // ── Row hover lift in price table ──────────────────────
    function initTableRowHover() {
        const observer = new MutationObserver(() => {
            document.querySelectorAll('.pt-row').forEach(row => {
                if (row.dataset.interactionBound) return;
                row.dataset.interactionBound = 'true';
                row.style.transition = `transform 200ms ${EASE}, background 200ms ${EASE}`;
                row.addEventListener('mouseenter', () => {
                    row.style.transform = 'translateX(4px)';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.transform = '';
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Initial pass
        document.querySelectorAll('.pt-row').forEach(row => {
            row.style.transition = `transform 200ms ${EASE}, background 200ms ${EASE}`;
            row.dataset.interactionBound = 'true';
            row.addEventListener('mouseenter', () => {
                row.style.transform = 'translateX(4px)';
            });
            row.addEventListener('mouseleave', () => {
                row.style.transform = '';
            });
        });
    }

    // ── Receipt line stagger animation on change ───────────
    function initReceiptAnimation() {
        const observer = new MutationObserver(() => {
            const lines = document.querySelectorAll('.receipt-line');
            lines.forEach((line, i) => {
                line.style.opacity = '0';
                line.style.transform = 'translateX(-8px)';
                line.style.transition = `opacity 250ms ${EASE} ${i * 60}ms, transform 250ms ${EASE} ${i * 60}ms`;
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        line.style.opacity = '1';
                        line.style.transform = 'translateX(0)';
                    });
                });
            });
        });

        const receiptContainer = document.getElementById('receipt-container');
        if (receiptContainer) {
            observer.observe(receiptContainer, { childList: true, subtree: true });
        }
    }

    // ── Scroll-triggered entrance animations ───────────────
    function initScrollAnimations() {
        const sections = document.querySelectorAll('#overview-section, #map-section, #price-table-section, #savings-section');

        sections.forEach(section => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            section.style.transition = `opacity 600ms ${EASE}, transform 600ms ${EASE}`;
        });

        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        sections.forEach(s => io.observe(s));
    }

    // ── Init all ───────────────────────────────────────────
    function init() {
        // Small delay to ensure DOM is populated by app.js
        setTimeout(() => {
            initTilt();
            initMagnetic();
            initTableRowHover();
            initReceiptAnimation();
            initScrollAnimations();
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
