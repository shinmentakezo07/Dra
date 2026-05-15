export function HydrationGuard() {
  return (
    <script
      id="hydration-guard"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function stripBisSkin(el) {
              if (el.hasAttribute && el.hasAttribute('bis_skin_checked')) {
                el.removeAttribute('bis_skin_checked');
              }
              if (el.querySelectorAll) {
                el.querySelectorAll('[bis_skin_checked]').forEach(function(child) {
                  child.removeAttribute('bis_skin_checked');
                });
              }
            }
            var observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'bis_skin_checked') {
                  mutation.target.removeAttribute('bis_skin_checked');
                  return;
                }
                mutation.addedNodes.forEach(function(node) {
                  if (node.nodeType === 1) {
                    stripBisSkin(node);
                  }
                });
              });
            });
            observer.observe(document.documentElement, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['bis_skin_checked']
            });
            stripBisSkin(document.documentElement);
          })();
        `,
      }}
    />
  );
}
