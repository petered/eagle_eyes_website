// Eagle Eyes Training - Navigation & Interactivity

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', function() {
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', function(e) {
      if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !menuToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach(function(question) {
    question.addEventListener('click', function() {
      this.parentElement.classList.toggle('open');
    });
  });

  // Hotspot interactivity
  document.querySelectorAll('.hotspot-zone').forEach(function(zone) {
    zone.addEventListener('click', function() {
      var targetId = this.getAttribute('data-detail');
      if (!targetId) return;

      // Remove active from all zones
      document.querySelectorAll('.hotspot-zone').forEach(function(z) {
        z.classList.remove('active');
      });
      // Hide all details
      document.querySelectorAll('.hotspot-detail').forEach(function(d) {
        d.classList.remove('visible');
      });

      // Show the target detail
      this.classList.add('active');
      var detail = document.getElementById(targetId);
      if (detail) {
        detail.classList.add('visible');
        detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });

  // Close detail buttons
  document.querySelectorAll('.close-detail').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var detail = this.closest('.hotspot-detail');
      if (detail) detail.classList.remove('visible');
      document.querySelectorAll('.hotspot-zone').forEach(function(z) {
        z.classList.remove('active');
      });
    });
  });
});

// Module completion tracking (localStorage)
var TrainingApp = {
  completeModule: function(moduleId) {
    try {
      var completed = JSON.parse(localStorage.getItem('completedModules') || '[]');
      if (completed.indexOf(moduleId) === -1) {
        completed.push(moduleId);
        localStorage.setItem('completedModules', JSON.stringify(completed));
      }
    } catch(e) {}
  },

  isModuleCompleted: function(moduleId) {
    try {
      var completed = JSON.parse(localStorage.getItem('completedModules') || '[]');
      return completed.indexOf(moduleId) !== -1;
    } catch(e) {
      return false;
    }
  }
};
