/* Mochi, the little mascot: eye tracking, 3D perspective, blinking and reactions. Exposes window.Mascot. */
(function () {
  const $ = (id) => document.getElementById(id);
  const mascot = $('mascot');
  const body = $('mascot-body');
  const face = $('mascot-face');
  const eyeL = $('eye-left');
  const eyeR = $('eye-right');
  const pupilL = $('pupil-left');
  const pupilR = $('pupil-right');
  const mouth = $('mascot-mouth');

  let mouseX = 0;
  let mouseY = 0;
  let frame = 0;
  let isHovered = false;

  function look(eye, pupil) {
    if (!eye || !pupil) return;
    const r = eye.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const angle = Math.atan2(mouseY - cy, mouseX - cx);
    // Smooth pupil travel up to 4.2px for large expressive eyes
    const dist = Math.min(4.2, Math.hypot(mouseX - cx, mouseY - cy) / 22);
    pupil.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
  }

  function update() {
    frame = 0;
    look(eyeL, pupilL);
    look(eyeR, pupilR);

    if (body && !body.classList.contains('spin-celebrate')) {
      const r = mascot.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = mouseX - cx;
      const dy = mouseY - cy;

      // 3D perspective rotation towards cursor
      const rotY = Math.max(-14, Math.min(14, dx / 32));
      const rotX = Math.max(-10, Math.min(10, -dy / 38));
      body.style.transform = `perspective(320px) rotateY(${rotY}deg) rotateX(${rotX}deg)`;

      // Subtle face parallax shift
      if (face) {
        const faceShiftX = Math.max(-2, Math.min(2, dx / 75));
        const faceShiftY = Math.max(-1.5, Math.min(1.5, dy / 85));
        face.style.transform = `translate(${faceShiftX}px, ${faceShiftY}px)`;
      }
    }
  }

  function blink() {
    if (!eyeL || !eyeR) return;
    eyeL.classList.add('blinking');
    eyeR.classList.add('blinking');
    setTimeout(() => {
      eyeL.classList.remove('blinking');
      eyeR.classList.remove('blinking');
      // Occasional cute double-blink
      if (Math.random() > 0.65) {
        setTimeout(() => {
          eyeL.classList.add('blinking');
          eyeR.classList.add('blinking');
          setTimeout(() => {
            eyeL.classList.remove('blinking');
            eyeR.classList.remove('blinking');
          }, 110);
        }, 150);
      }
    }, 140);
  }

  function setMood(mood) {
    if (!mouth) return;
    mouth.className = mood ? `mascot-mouth ${mood}` : (isHovered ? 'mascot-mouth happy' : 'mascot-mouth');
  }

  function celebrate() {
    if (!body) return;
    body.classList.add('spin-celebrate');
    setMood('happy');
    setTimeout(() => {
      body.classList.remove('spin-celebrate');
      setMood('');
    }, 650);
  }

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!frame) frame = requestAnimationFrame(update);
  });

  if (mascot) {
    mascot.addEventListener('mouseenter', () => {
      isHovered = true;
      if (body) body.classList.add('mascot-hovered');
      setMood('happy');
    });

    mascot.addEventListener('mouseleave', () => {
      isHovered = false;
      if (body) body.classList.remove('mascot-hovered');
      setMood('');
    });

    mascot.addEventListener('click', () => {
      celebrate();
      if (window.onMascotClick) window.onMascotClick();
    });
  }

  setInterval(() => {
    if (!document.hidden && Math.random() > 0.25) blink();
  }, 3200);

  window.Mascot = { setMood, celebrate };
})();
