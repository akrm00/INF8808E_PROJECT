document.addEventListener('DOMContentLoaded', function() {
    
    initializeAnimations();
    initializeCardInteractions();
    
    initializeSmoothScrolling();
});

function initializeAnimations() {
    const cards = document.querySelectorAll('.viz-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 150);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease-out';
        observer.observe(card);
    });
}

function initializeCardInteractions() {
    const cards = document.querySelectorAll('.viz-card');
    
    cards.forEach(card => {
        const preview = card.querySelector('.card-preview');
        
        card.addEventListener('mouseenter', () => {
            animatePreview(preview);
        });
        
        card.addEventListener('mouseleave', () => {
            resetPreviewAnimation(preview);
        });
        
        card.addEventListener('click', (e) => {
            const cardTitle = card.querySelector('.card-title').textContent;
            console.log(`Navigating to: ${cardTitle}`);
            
            showLoadingIndicator(card);
        });
    });
}

function animatePreview(preview) {
    const wafflePreview = preview.querySelector('.waffle-preview');
    const heatmapPreview = preview.querySelector('.heatmap-preview');
    const barPreview = preview.querySelector('.bar-preview');
    const scatterPreview = preview.querySelector('.scatter-preview');
    
    if (wafflePreview) {
        animateWaffleChart(wafflePreview);
    } else if (heatmapPreview) {
        animateHeatmap(heatmapPreview);
    } else if (barPreview) {
        animateBarChart(barPreview);
    } else if (scatterPreview) {
        animateScatterPlot(scatterPreview);
    }
}

function animateWaffleChart(container) {
    const cells = container.querySelectorAll('.waffle-cell');
    cells.forEach((cell, index) => {
        setTimeout(() => {
            cell.style.transform = 'scale(1.1)';
            cell.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                cell.style.transform = 'scale(1)';
            }, 150);
        }, index * 20);
    });
}

function animateHeatmap(container) {
    const cells = container.querySelectorAll('.heatmap-cell');
    cells.forEach((cell, index) => {
        setTimeout(() => {
            const currentOpacity = window.getComputedStyle(cell).opacity;
            cell.style.opacity = Math.min(1, parseFloat(currentOpacity) + 0.3);
            cell.style.transition = 'opacity 0.3s ease';
        }, index * 15);
    });
}

function animateBarChart(container) {
    const bars = container.querySelectorAll('.bar');
    bars.forEach((bar, index) => {
        setTimeout(() => {
            const currentHeight = parseInt(bar.style.height || window.getComputedStyle(bar).height);
            bar.style.transform = 'scaleY(1.2)';
            bar.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                bar.style.transform = 'scaleY(1)';
            }, 200);
        }, index * 50);
    });
}

function animateScatterPlot(container) {
    const points = container.querySelectorAll('.scatter-point');
    points.forEach((point, index) => {
        setTimeout(() => {
            point.style.transform = 'scale(1.5)';
            point.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                point.style.transform = 'scale(1)';
            }, 200);
        }, index * 30);
    });
}

function resetPreviewAnimation(preview) {
    const elements = preview.querySelectorAll('.waffle-cell, .heatmap-cell, .bar, .scatter-point');
    elements.forEach(element => {
        element.style.transform = '';
        element.style.opacity = '';
        element.style.transition = '';
    });
}

function showLoadingIndicator(card) {
    const preview = card.querySelector('.card-preview');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.style.position = 'absolute';
    loadingDiv.style.top = '50%';
    loadingDiv.style.left = '50%';
    loadingDiv.style.transform = 'translate(-50%, -50%)';
    
    preview.style.position = 'relative';
    preview.appendChild(loadingDiv);
    
    setTimeout(() => {
        if (loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }
    }, 1000);
}

function initializeSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function fadeInElement(element, delay = 0) {
    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }, delay);
}

function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

let ticking = false;

function updateOnScroll() {
    ticking = false;
}

function requestTick() {
    if (!ticking) {
        requestAnimationFrame(updateOnScroll);
        ticking = true;
    }
}

window.addEventListener('scroll', requestTick);