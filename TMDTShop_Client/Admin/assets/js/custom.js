async function loadComponent(id, file) {
    const res = await fetch(file);
    const text = await res.text();
    document.getElementById(id).innerHTML = text;
}

loadComponent('sidebar', '/Admin/components/sidebar.html');
loadComponent('header', '/Admin/components/header.html');
loadComponent('footer', '/Admin/components/footer.html');