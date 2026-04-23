// Eagle Eyes Training - Navigation & Interactivity

// Module completion tracking (localStorage)
var TrainingApp = {
  completeModule: function(moduleId) {
    try {
      var completed = JSON.parse(localStorage.getItem('completedModules') || '[]');
      if (completed.indexOf(moduleId) === -1) {
        completed.push(moduleId);
        localStorage.setItem('completedModules', JSON.stringify(completed));
      }
    } catch(e) { console.error('completeModule error:', e); }
  },

  isModuleCompleted: function(moduleId) {
    try {
      var completed = JSON.parse(localStorage.getItem('completedModules') || '[]');
      return completed.indexOf(moduleId) !== -1;
    } catch(e) {
      return false;
    }
  },

  ALL_MODULES: [
    '01-getting-started',
    '02-core-interface',
    '03-detection-system',
    '05-camera-control',
    '07-caltopo',
    '09-livestreaming',
    '11-flight-missions',
    '12-advanced-features'
  ],

  allModulesCompleted: function() {
    for (var i = 0; i < this.ALL_MODULES.length; i++) {
      if (!this.isModuleCompleted(this.ALL_MODULES[i])) return false;
    }
    return true;
  }
};

// Quiz Engine
var QuizEngine = {
  init: function() {
    var quizForm = document.getElementById('quiz-form');
    if (!quizForm) return;

    var moduleId = quizForm.getAttribute('data-module');
    var submitBtn = quizForm.querySelector('.quiz-submit-btn');
    var resultDiv = quizForm.querySelector('.quiz-result');

    if (moduleId && this.isQuizPassed(moduleId)) {
      this.showPassedState(quizForm, resultDiv);
      this.unlockNextButton(moduleId);
      return;
    }

    this.lockNextButton();

    if (submitBtn) {
      submitBtn.addEventListener('click', function() {
        QuizEngine.checkAnswers(quizForm, moduleId, resultDiv);
      });
    }
  },

  checkAnswers: function(form, moduleId, resultDiv) {
    var questions = form.querySelectorAll('.quiz-question');
    var total = questions.length;
    var correct = 0;
    var allAnswered = true;

    questions.forEach(function(q) {
      q.classList.remove('correct', 'incorrect');
      var labels = q.querySelectorAll('label');
      labels.forEach(function(l) { l.classList.remove('correct-answer'); });

      var correctAnswer = q.getAttribute('data-correct');
      var radioInput = q.querySelector('input[type="radio"]');
      if (!radioInput) return;
      var name = radioInput.name;
      var selected = form.querySelector('input[name="' + name + '"]:checked');

      if (!selected) {
        allAnswered = false;
        q.classList.add('incorrect');
        return;
      }

      if (selected.value === correctAnswer) {
        correct++;
        q.classList.add('correct');
      } else {
        q.classList.add('incorrect');
        labels.forEach(function(label) {
          var input = label.querySelector('input');
          if (input && input.value === correctAnswer) {
            label.classList.add('correct-answer');
          }
        });
      }
    });

    if (!allAnswered) {
      resultDiv.className = 'quiz-result quiz-failed';
      resultDiv.innerHTML = '<strong>&#10008; Please answer all questions before submitting.</strong>';
      resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    if (correct === total) {
      this.markQuizPassed(moduleId);
      resultDiv.className = 'quiz-result quiz-passed';
      resultDiv.innerHTML = '<strong>&#10004; Perfect Score!</strong> You got all ' + total + ' questions correct. You may proceed to the next module.';
      this.unlockNextButton(moduleId);
      TrainingApp.completeModule(moduleId);
      var btn = form.querySelector('.quiz-submit-btn');
      if (btn) btn.style.display = 'none';
    } else {
      resultDiv.className = 'quiz-result quiz-failed';
      resultDiv.innerHTML = '<strong>&#10008; ' + correct + ' of ' + total + ' correct.</strong> You must answer all questions correctly to proceed. Review the incorrect answers (shown in red) and try again.';
      resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  showPassedState: function(form, resultDiv) {
    var questions = form.querySelectorAll('.quiz-question');
    questions.forEach(function(q) {
      q.classList.add('correct');
      var inputs = q.querySelectorAll('input[type="radio"]');
      inputs.forEach(function(input) { input.disabled = true; });
    });
    resultDiv.className = 'quiz-result quiz-passed';
    resultDiv.innerHTML = '<strong>&#10004; Quiz Passed!</strong> You have already completed this knowledge check.';
    var btn = form.querySelector('.quiz-submit-btn');
    if (btn) btn.style.display = 'none';
  },

  lockNextButton: function() {
    var nextBtn = document.querySelector('.nav-btn.next');
    if (nextBtn) {
      nextBtn.classList.add('nav-btn-locked');
      nextBtn.setAttribute('title', 'Pass the Knowledge Check to continue');
      nextBtn.addEventListener('click', function(e) {
        if (nextBtn.classList.contains('nav-btn-locked')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          nextBtn.classList.add('shake');
          setTimeout(function() { nextBtn.classList.remove('shake'); }, 600);
          return false;
        }
      }, true);
    }
  },

  unlockNextButton: function(moduleId) {
    var nextBtn = document.querySelector('.nav-btn.next');
    if (nextBtn) {
      nextBtn.classList.remove('nav-btn-locked');
      nextBtn.setAttribute('title', '');
    }
  },

  isQuizPassed: function(moduleId) {
    try {
      var passed = JSON.parse(localStorage.getItem('quizzesPassed') || '[]');
      return passed.indexOf(moduleId) !== -1;
    } catch(e) {
      return false;
    }
  },

  markQuizPassed: function(moduleId) {
    try {
      var passed = JSON.parse(localStorage.getItem('quizzesPassed') || '[]');
      if (passed.indexOf(moduleId) === -1) {
        passed.push(moduleId);
        localStorage.setItem('quizzesPassed', JSON.stringify(passed));
      }
    } catch(e) { console.error('markQuizPassed error:', e); }
  }
};

// DOM-ready initialization
function initPage() {
  // Mobile menu toggle
  var menuToggle = document.querySelector('.menu-toggle');
  var sidebar = document.querySelector('.sidebar');

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

      document.querySelectorAll('.hotspot-zone').forEach(function(z) {
        z.classList.remove('active');
      });
      document.querySelectorAll('.hotspot-detail').forEach(function(d) {
        d.classList.remove('visible');
      });

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

  // Initialize quiz
  try {
    QuizEngine.init();
  } catch(e) {
    console.error('QuizEngine.init error:', e);
  }
}

// Run when DOM is ready - handles both cases
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
