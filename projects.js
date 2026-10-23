(function () {
  const categories = window.PROJECTS || [];
  const nav = document.getElementById("project-nav");
  const title = document.getElementById("project-title");
  const meta = document.getElementById("project-meta");
  const gallery = document.getElementById("gallery");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");

  const allProjects = categories.flatMap((cat) =>
    cat.projects.map((project) => ({ ...project, category: cat.name }))
  );

  function projectBySlug(slug) {
    if (!slug) return null;
    return allProjects.find((p) => p.slug === slug) || null;
  }

  function encodeSrc(path) {
    return encodeURI(path);
  }

  function renderNav(activeSlug) {
    const openSlugs = new Set(
      [...nav.querySelectorAll("details.nav-group[open]")].map((el) => el.dataset.slug)
    );

    nav.innerHTML = "";
    categories.forEach((cat) => {
      const group = document.createElement("details");
      group.className = "nav-group";
      group.dataset.slug = cat.slug;
      const containsActive = cat.projects.some((project) => project.slug === activeSlug);
      if (containsActive || openSlugs.has(cat.slug)) {
        group.open = true;
      }

      const summary = document.createElement("summary");
      summary.textContent = cat.name;
      group.appendChild(summary);

      const list = document.createElement("ul");
      cat.projects.forEach((project) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = "#" + project.slug;
        link.textContent = project.name;
        if (project.slug === activeSlug) {
          link.setAttribute("aria-current", "page");
        }
        item.appendChild(link);
        list.appendChild(item);
      });
      group.appendChild(list);
      nav.appendChild(group);
    });
  }

  let currentImages = [];
  let lightboxIndex = 0;

  function renderProject(project) {
    if (!project) {
      if (title) title.textContent = "";
      gallery.innerHTML = "";
      currentImages = [];
      return;
    }

    if (title) title.textContent = project.name;
    // meta.textContent =
    //   project.category +
    //   " · " +
    //   project.images.length +
    //   (project.images.length === 1 ? " photo" : " photos");
    gallery.innerHTML = "";
    currentImages = project.images;

    project.images.forEach((path, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-item";
      button.setAttribute("aria-label", "Open photo " + (index + 1));

      const img = document.createElement("img");
      img.src = encodeSrc(path);
      img.alt = project.name;
      img.loading = "lazy";
      img.width = 800;
      img.height = 600;

      button.appendChild(img);
      button.addEventListener("click", () => openLightbox(index));
      gallery.appendChild(button);
    });
  }

  function showProjectFromHash(options) {
    const slug = decodeURIComponent(location.hash.replace(/^#/, ""));
    const project = projectBySlug(slug);
    renderNav(project ? project.slug : null);
    renderProject(project);
    if (options && options.scroll && project) {
      document.getElementById("project-view").scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  function openLightbox(index) {
    lightboxIndex = index;
    updateLightbox();
    if (typeof lightbox.showModal === "function") {
      lightbox.showModal();
    }
  }

  function updateLightbox() {
    const path = currentImages[lightboxIndex];
    if (!path) return;
    lightboxImg.src = encodeSrc(path);
    lightboxImg.alt = title.textContent + ", photo " + (lightboxIndex + 1);
  }

  function stepLightbox(delta) {
    if (!currentImages.length) return;
    lightboxIndex = (lightboxIndex + delta + currentImages.length) % currentImages.length;
    updateLightbox();
  }

  lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
  lightbox.querySelector(".lightbox-prev").addEventListener("click", () => stepLightbox(-1));
  lightbox.querySelector(".lightbox-next").addEventListener("click", () => stepLightbox(1));
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  document.addEventListener("keydown", (event) => {
    if (!lightbox.open) return;
    if (event.key === "ArrowLeft") stepLightbox(-1);
    if (event.key === "ArrowRight") stepLightbox(1);
  });

  window.addEventListener("hashchange", () => showProjectFromHash({ scroll: true }));
  showProjectFromHash({ scroll: false });
})();
