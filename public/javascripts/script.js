document.addEventListener('DOMContentLoaded', () => {
    const textModeBtn = document.getElementById('text-mode-btn');
    const fileModeBtn = document.getElementById('file-mode-btn');
    const fileToFileModeBtn = document.getElementById('file-to-file-mode-btn');
    const textSection = document.getElementById('text-section');
    const fileSection = document.getElementById('file-section');
    const fileToFileSection = document.getElementById('file-to-file-section');

    textModeBtn.addEventListener('click', () => {
        textSection.classList.add('active');
        textModeBtn.classList.add('active');
        fileModeBtn.classList.remove('active');
        fileSection.classList.remove('active');
        fileToFileModeBtn.classList.remove('active');
        fileToFileSection.classList.remove('active');
    });

    fileModeBtn.addEventListener('click', () => {
        fileModeBtn.classList.add('active');
        fileSection.classList.add('active');
        textSection.classList.remove('active');
        textModeBtn.classList.remove('active');
        fileToFileSection.classList.remove('active');
        fileToFileModeBtn.classList.remove('active');
    });

    fileToFileModeBtn.addEventListener('click', () => {
        fileToFileSection.classList.add('active');
        fileToFileModeBtn.classList.add('active');
        textSection.classList.remove('active');
        textModeBtn.classList.remove('active');
        fileModeBtn.classList.remove('active');
        fileSection.classList.remove('active');
    });

    let translateButton = document.getElementById('translate-btn');
    if(translateButton) {
        translateButton.addEventListener('click', async function() {
            const textInput = document.getElementById('text-input').value;
            const fromLang = document.getElementById('from-lang').value;
            const toLang = document.getElementById('to-lang').value;

            if (textInput.trim() === '') {
                alert('Bitte geben Sie einen Text ein.');
                return;
            }

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ text: textInput, from: fromLang, to: toLang })
                });

                if (!response.ok) {
                    throw new Error('Übersetzungsanforderung fehlgeschlagen');
                }

                const data = await response.json();
                document.getElementById('output').textContent = data.translatedText;
            } catch (error) {
                console.error('Fehler bei der Übersetzung:', error);
                alert('Fehler bei der Übersetzung. Bitte versuchen Sie es erneut.');
            }
        });
    }

    let download_button = document.getElementById('download-pdf');
    if(download_button) {
        download_button.addEventListener('click', async function() {
            const translatedText = document.getElementById('output').textContent;

            const response = await fetch('/download-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ translatedText })
            });

            if (!response.ok) {
                alert('Fehler beim PDF-Download. Bitte versuchen Sie es erneut.');
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'translated.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    let download_file_button = document.getElementById('download-file-pdf');
    if(download_file_button) {
        download_file_button.addEventListener('click', async function() {
            const translatedText = document.getElementById('file-output').textContent;

            const response = await fetch('/download-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ translatedText })
            });

            if (!response.ok) {
                alert('Fehler beim PDF-Download. Bitte versuchen Sie es erneut.');
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'translated.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }
});
