/* ─── Documentation JavaScript ────────────────────────
   Features:
   - Copy code button
   - Active sidebar link highlighting
   - Smooth anchor scrolling
   ───────────────────────────────────────────────────── */

(function() {
    'use strict';

    // ─── Copy Code Buttons ──────────────────────────

    document.querySelectorAll('pre').forEach((block) => {
        const button = document.createElement('button');
        button.className = 'copy-btn';
        button.textContent = 'Copy';
        button.setAttribute('aria-label', 'Copy code to clipboard');

        button.addEventListener('click', () => {
            const code = block.querySelector('code');
            if (!code) return;

            const text = code.textContent;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    button.textContent = 'Copied!';
                    button.classList.add('copied');
                    setTimeout(() => {
                        button.textContent = 'Copy';
                        button.classList.remove('copied');
                    }, 1800);
                }).catch(() => {
                    fallbackCopy(text, button);
                });
            } else {
                fallbackCopy(text, button);
            }
        });

        block.appendChild(button);
    });

    function fallbackCopy(text, button) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            button.textContent = 'Copied!';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = 'Copy';
                button.classList.remove('copied');
            }, 1800);
        } catch (err) {
            // Silent fail
        }
        document.body.removeChild(textarea);
    }

    // ─── Active Sidebar Link ────────────────────────

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.docs-sidebar a:not(.external)').forEach((link) => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('active');
        }
    });

    // ─── Smooth Anchor Scrolling ────────────────────

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

})();