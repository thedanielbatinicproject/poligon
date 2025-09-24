// Glavna JavaScript datoteka za frontend funkcionalnost

document.addEventListener('DOMContentLoaded', function() {
    // Dugme za provjeru statusa servera
    const statusBtn = document.getElementById('statusBtn');
    const statusResult = document.getElementById('statusResult');

    if (statusBtn && statusResult) {
        statusBtn.addEventListener('click', async function() {
            try {
                statusBtn.textContent = 'Provjeravam...';
                statusBtn.disabled = true;

                const response = await fetch('/api/status');
                const data = await response.json();

                if (response.ok) {
                    statusResult.innerHTML = `
                        <h4>Status: ${data.status}</h4>
                        <p>Poruka: ${data.message}</p>
                        <p>Vrijeme: ${new Date(data.timestamp).toLocaleString()}</p>
                    `;
                    statusResult.className = 'status-result success';
                } else {
                    throw new Error('Server error');
                }

                statusResult.style.display = 'block';
            } catch (error) {
                statusResult.innerHTML = `
                    <h4>Greška!</h4>
                    <p>Nije moguće povezati se s poslužiteljem.</p>
                `;
                statusResult.className = 'status-result error';
                statusResult.style.display = 'block';
            } finally {
                statusBtn.textContent = 'Provjeri status poslužitelja';
                statusBtn.disabled = false;
            }
        });
    }

    // Smooth scroll za linkove
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Console poruka za developere
    console.log('🚀 Poligon aplikacija pokrenuta!');
    console.log('Verzija: 1.0.0');
});