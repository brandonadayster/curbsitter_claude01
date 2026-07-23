(() => {
  const toggles = document.querySelectorAll('[data-billing-toggle]');

  toggles.forEach((toggle) => {
    const buttons = toggle.querySelectorAll('button[data-billing]');
    const scope = toggle.closest('[data-pricing-scope]') || document;

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const billing = button.dataset.billing;
        buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));

        scope.querySelectorAll('[data-monthly][data-quarterly]').forEach((price) => {
          price.textContent = billing === 'quarterly' ? price.dataset.quarterly : price.dataset.monthly;
        });

        scope.querySelectorAll('[data-monthly-note][data-quarterly-note]').forEach((note) => {
          note.textContent = billing === 'quarterly' ? note.dataset.quarterlyNote : note.dataset.monthlyNote;
        });
      });
    });
  });
})();
