// Función para actualizar el texto del botón del tema
function updateThemeButton() {
  const themeButton = document.querySelector('.btn-theme');
  if (themeButton) {
    const isAltTheme = document.body.classList.contains('theme-alt');
    themeButton.innerHTML = isAltTheme ? '🎨 Modo Claro' : '🎨 Modo Oscuro';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Poner el año actual en el footer
  const yearSpan = document.getElementById('currentYear');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Aplicar el tema guardado en localStorage
  if (localStorage.getItem('theme') === 'alt') {
    document.body.classList.add('theme-alt');
  }

  // Actualizar el texto del botón al cargar la página
  updateThemeButton();
});

// Función para cambiar el tema
function toggleTheme() {
  document.body.classList.toggle('theme-alt');
  const theme = document.body.classList.contains('theme-alt') ? 'alt' : 'original';
  localStorage.setItem('theme', theme);
  // Actualizar el texto del botón al cambiar el tema
  updateThemeButton();
}