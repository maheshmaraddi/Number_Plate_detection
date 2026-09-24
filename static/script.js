const uploadTab = document.getElementById("uploadTab");
const cameraTab = document.getElementById("cameraTab");

const uploadSection = document.getElementById("uploadSection");
const cameraSection = document.getElementById("cameraSection");

const imageInput = document.getElementById("imageInput");
const dropZone = document.getElementById("dropZone");

const cameraVideo = document.getElementById("cameraVideo");
const cameraCanvas = document.getElementById("cameraCanvas");

const cameraPlaceholder = document.getElementById(
    "cameraPlaceholder"
);

const startCameraButton = document.getElementById(
    "startCameraButton"
);

const captureButton = document.getElementById(
    "captureButton"
);

const confidenceInput = document.getElementById(
    "confidenceInput"
);

const confidenceValue = document.getElementById(
    "confidenceValue"
);

const iouInput = document.getElementById(
    "iouInput"
);

const iouValue = document.getElementById(
    "iouValue"
);

const imageSizeInput = document.getElementById(
    "imageSizeInput"
);

const resetSettingsButton = document.getElementById(
    "resetSettingsButton"
);

const predictButton = document.getElementById(
    "predictButton"
);

const predictButtonText = document.getElementById(
    "predictButtonText"
);

const clearButton = document.getElementById(
    "clearButton"
);

const previewTitle = document.getElementById(
    "previewTitle"
);

const emptyPreview = document.getElementById(
    "emptyPreview"
);

const resultCanvas = document.getElementById(
    "resultCanvas"
);

const resultContext = resultCanvas.getContext("2d");

const loadingOverlay = document.getElementById(
    "loadingOverlay"
);

const errorMessage = document.getElementById(
    "errorMessage"
);

const jsonOutput = document.getElementById(
    "jsonOutput"
);

const detectionCount = document.getElementById(
    "detectionCount"
);

const topConfidence = document.getElementById(
    "topConfidence"
);

const inferenceTime = document.getElementById(
    "inferenceTime"
);

const resultStatus = document.getElementById(
    "resultStatus"
);

const detectionsList = document.getElementById(
    "detectionsList"
);


let selectedImageBlob = null;
let selectedFileName = "";
let previewImage = null;
let cameraStream = null;


/*
|--------------------------------------------------------------------------
| Tab switching
|--------------------------------------------------------------------------
*/

function switchTab(tabName) {
    const isUploadTab = tabName === "upload";

    uploadTab.classList.toggle(
        "active",
        isUploadTab
    );

    cameraTab.classList.toggle(
        "active",
        !isUploadTab
    );

    uploadSection.classList.toggle(
        "active",
        isUploadTab
    );

    cameraSection.classList.toggle(
        "active",
        !isUploadTab
    );
}


uploadTab.addEventListener("click", () => {
    switchTab("upload");
});


cameraTab.addEventListener("click", () => {
    switchTab("camera");
});


/*
|--------------------------------------------------------------------------
| Settings
|--------------------------------------------------------------------------
*/

confidenceInput.addEventListener("input", () => {
    confidenceValue.textContent = Number(
        confidenceInput.value
    ).toFixed(2);
});


iouInput.addEventListener("input", () => {
    iouValue.textContent = Number(
        iouInput.value
    ).toFixed(2);
});


resetSettingsButton.addEventListener("click", () => {
    confidenceInput.value = "0.25";
    confidenceValue.textContent = "0.25";

    iouInput.value = "0.70";
    iouValue.textContent = "0.70";

    imageSizeInput.value = "640";
});


/*
|--------------------------------------------------------------------------
| Image upload
|--------------------------------------------------------------------------
*/

imageInput.addEventListener("change", () => {
    const selectedFile = imageInput.files[0];

    if (selectedFile) {
        setSelectedImage(
            selectedFile,
            selectedFile.name
        );
    }
});


["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();

        dropZone.classList.add("dragging");
    });
});


["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();

        dropZone.classList.remove("dragging");
    });
});


dropZone.addEventListener("drop", (event) => {
    const droppedFile = event.dataTransfer.files[0];

    if (droppedFile) {
        setSelectedImage(
            droppedFile,
            droppedFile.name
        );
    }
});


/*
|--------------------------------------------------------------------------
| Camera
|--------------------------------------------------------------------------
*/

async function startCamera() {
    errorMessage.textContent = "";

    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error(
                "Camera access is not supported in this browser."
            );
        }

        stopCamera();

        cameraStream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: {
                        ideal: 1280,
                    },
                    height: {
                        ideal: 720,
                    },
                },
                audio: false,
            });

        cameraVideo.srcObject = cameraStream;

        await cameraVideo.play();

        cameraPlaceholder.style.display = "none";
        captureButton.disabled = false;

        startCameraButton.textContent =
            "Restart Camera";

    } catch (error) {
        errorMessage.textContent =
            `Camera error: ${error.message}`;
    }
}


function stopCamera() {
    if (!cameraStream) {
        return;
    }

    cameraStream
        .getTracks()
        .forEach((track) => {
            track.stop();
        });

    cameraStream = null;
}


startCameraButton.addEventListener(
    "click",
    startCamera
);


captureButton.addEventListener("click", () => {
    if (
        !cameraVideo.videoWidth ||
        !cameraVideo.videoHeight
    ) {
        errorMessage.textContent =
            "Camera is not ready yet.";

        return;
    }

    cameraCanvas.width =
        cameraVideo.videoWidth;

    cameraCanvas.height =
        cameraVideo.videoHeight;

    const cameraContext =
        cameraCanvas.getContext("2d");

    cameraContext.save();

    cameraContext.translate(
        cameraCanvas.width,
        0
    );

    cameraContext.scale(
        -1,
        1
    );

    cameraContext.drawImage(
        cameraVideo,
        0,
        0,
        cameraCanvas.width,
        cameraCanvas.height
    );

    cameraContext.restore();

    cameraCanvas.toBlob(
        (blob) => {
            if (!blob) {
                errorMessage.textContent =
                    "Could not capture the image.";

                return;
            }

            setSelectedImage(
                blob,
                `camera-capture-${Date.now()}.jpg`
            );
        },
        "image/jpeg",
        0.92
    );
});


/*
|--------------------------------------------------------------------------
| Image selection and preview
|--------------------------------------------------------------------------
*/

function setSelectedImage(blob, fileName) {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    if (!allowedTypes.includes(blob.type)) {
        errorMessage.textContent =
            "Only JPG, PNG and WEBP images are supported.";

        return;
    }

    const maximumSize = 10 * 1024 * 1024;

    if (blob.size > maximumSize) {
        errorMessage.textContent =
            "The image must be 10 MB or smaller.";

        return;
    }

    selectedImageBlob = blob;
    selectedFileName = fileName || "image.jpg";

    errorMessage.textContent = "";

    predictButton.disabled = false;
    clearButton.disabled = false;

    previewTitle.textContent =
        selectedFileName;

    detectionCount.textContent = "—";
    topConfidence.textContent = "—";
    inferenceTime.textContent = "—";
    resultStatus.textContent = "Ready";

    jsonOutput.textContent =
        "Image ready. Click Detect License Plate.";

    detectionsList.innerHTML = `
        <p class="no-detections-message">
            Run detection to see results.
        </p>
    `;

    const imageUrl = URL.createObjectURL(blob);

    const image = new Image();

    image.onload = () => {
        previewImage = image;

        drawOriginalImage();

        URL.revokeObjectURL(imageUrl);
    };

    image.onerror = () => {
        errorMessage.textContent =
            "Could not display the selected image.";

        URL.revokeObjectURL(imageUrl);
    };

    image.src = imageUrl;
}


function drawOriginalImage() {
    if (!previewImage) {
        return;
    }

    resultCanvas.width =
        previewImage.naturalWidth;

    resultCanvas.height =
        previewImage.naturalHeight;

    resultContext.clearRect(
        0,
        0,
        resultCanvas.width,
        resultCanvas.height
    );

    resultContext.drawImage(
        previewImage,
        0,
        0,
        resultCanvas.width,
        resultCanvas.height
    );

    emptyPreview.style.display = "none";
    resultCanvas.style.display = "block";
}


/*
|--------------------------------------------------------------------------
| Clear
|--------------------------------------------------------------------------
*/

clearButton.addEventListener("click", () => {
    clearSelectedImage();
});


function clearSelectedImage() {
    selectedImageBlob = null;
    selectedFileName = "";
    previewImage = null;

    imageInput.value = "";

    resultContext.clearRect(
        0,
        0,
        resultCanvas.width,
        resultCanvas.height
    );

    resultCanvas.style.display = "none";
    emptyPreview.style.display = "block";

    predictButton.disabled = true;
    clearButton.disabled = true;

    previewTitle.textContent =
        "No image selected";

    detectionCount.textContent = "—";
    topConfidence.textContent = "—";
    inferenceTime.textContent = "—";
    resultStatus.textContent = "Waiting";

    jsonOutput.textContent =
        "No prediction response yet.";

    detectionsList.innerHTML = `
        <p class="no-detections-message">
            No detections yet.
        </p>
    `;

    errorMessage.textContent = "";
}


/*
|--------------------------------------------------------------------------
| Prediction
|--------------------------------------------------------------------------
*/

predictButton.addEventListener(
    "click",
    runPrediction
);


async function runPrediction() {
    if (!selectedImageBlob) {
        errorMessage.textContent =
            "Please select or capture an image first.";

        return;
    }

    const formData = new FormData();

    formData.append(
        "file",
        selectedImageBlob,
        selectedFileName
    );

    formData.append(
        "conf",
        confidenceInput.value
    );

    formData.append(
        "iou",
        iouInput.value
    );

    formData.append(
        "imgsz",
        imageSizeInput.value
    );

    setLoading(true);

    errorMessage.textContent = "";

    try {
        const response = await fetch(
            "/predict",
            {
                method: "POST",
                body: formData,
            }
        );

        let responseData;

        try {
            responseData = await response.json();
        } catch {
            throw new Error(
                "The server returned an invalid response."
            );
        }

        if (!response.ok) {
            let message = "Prediction failed.";

            if (
                typeof responseData.detail === "string"
            ) {
                message = responseData.detail;

            } else if (responseData.detail) {
                message = JSON.stringify(
                    responseData.detail
                );
            }

            throw new Error(message);
        }

        jsonOutput.textContent =
            JSON.stringify(
                responseData,
                null,
                2
            );

        const detections =
            extractDetections(responseData);

        drawDetections(detections);
        updateMetrics(detections, responseData);
        renderDetectionsList(detections);

        resultStatus.textContent =
            "Complete";

    } catch (error) {
        errorMessage.textContent =
            error.message ||
            "Prediction failed.";

        resultStatus.textContent =
            "Error";

    } finally {
        setLoading(false);
    }
}


function setLoading(isLoading) {
    loadingOverlay.classList.toggle(
        "active",
        isLoading
    );

    predictButton.disabled =
        isLoading || !selectedImageBlob;

    predictButtonText.textContent =
        isLoading
            ? "Processing..."
            : "Detect License Plate";
}


/*
|--------------------------------------------------------------------------
| Extract API detections
|--------------------------------------------------------------------------
|
| API response format:
|
| {
|   "images": [
|     {
|       "shape": [836, 1256],
|       "speed": {...},
|       "results": [
|         {
|           "name": "license-plate",
|           "class": 0,
|           "confidence": 0.94249,
|           "box": {
|             "x1": 609.87,
|             "y1": 624.52,
|             "x2": 800.73,
|             "y2": 671.55
|           }
|         }
|       ]
|     }
|   ]
| }
|--------------------------------------------------------------------------
*/

function extractDetections(responseData) {
    if (
        !responseData ||
        !Array.isArray(responseData.images)
    ) {
        return [];
    }

    const detections = [];

    responseData.images.forEach((imageResult) => {
        if (!Array.isArray(imageResult.results)) {
            return;
        }

        imageResult.results.forEach((result) => {
            if (!result.box) {
                return;
            }

            const box = [
                Number(result.box.x1),
                Number(result.box.y1),
                Number(result.box.x2),
                Number(result.box.y2),
            ];

            const isValidBox = box.every(
                (value) => Number.isFinite(value)
            );

            if (!isValidBox) {
                return;
            }

            detections.push({
                label: String(
                    result.name ??
                    result.label ??
                    result.class ??
                    "object"
                ),

                classId: Number(
                    result.class ?? 0
                ),

                confidence: Number(
                    result.confidence ?? 0
                ),

                box: box,
            });
        });
    });

    return detections;
}


/*
|--------------------------------------------------------------------------
| Draw bounding boxes
|--------------------------------------------------------------------------
*/

function drawDetections(detections) {
    drawOriginalImage();

    if (
        !previewImage ||
        !Array.isArray(detections) ||
        detections.length === 0
    ) {
        return;
    }

    const canvasWidth =
        resultCanvas.width;

    const canvasHeight =
        resultCanvas.height;

    const lineWidth = Math.max(
        4,
        Math.round(
            Math.min(
                canvasWidth,
                canvasHeight
            ) / 220
        )
    );

    const fontSize = Math.max(
        18,
        Math.round(
            Math.min(
                canvasWidth,
                canvasHeight
            ) / 30
        )
    );

    const colors = [
        "#00e5ff",
        "#ff4fd8",
        "#80ff72",
        "#ffd84d",
        "#9b7bff",
        "#ff745c",
    ];

    resultContext.lineWidth =
        lineWidth;

    resultContext.font =
        `700 ${fontSize}px Arial`;

    resultContext.textBaseline =
        "top";

    detections.forEach(
        (detection, index) => {
            if (
                !detection.box ||
                detection.box.length < 4
            ) {
                return;
            }

            let [x1, y1, x2, y2] =
                detection.box;

            const maximumCoordinate =
                Math.max(
                    Math.abs(x1),
                    Math.abs(y1),
                    Math.abs(x2),
                    Math.abs(y2)
                );

            /*
             * Supports normalized 0-1 coordinates.
             */
            if (maximumCoordinate <= 1.5) {
                x1 *= canvasWidth;
                x2 *= canvasWidth;

                y1 *= canvasHeight;
                y2 *= canvasHeight;
            }

            const boxWidth =
                Math.max(0, x2 - x1);

            const boxHeight =
                Math.max(0, y2 - y1);

            const boxColor =
                colors[index % colors.length];

            resultContext.strokeStyle =
                boxColor;

            resultContext.shadowColor =
                boxColor;

            resultContext.shadowBlur = 8;

            resultContext.strokeRect(
                x1,
                y1,
                boxWidth,
                boxHeight
            );

            resultContext.shadowBlur = 0;

            const confidencePercentage =
                Number.isFinite(
                    detection.confidence
                )
                    ? (
                        detection.confidence * 100
                    ).toFixed(1)
                    : "0.0";

            const labelText =
                `${detection.label} ${confidencePercentage}%`;

            const textMetrics =
                resultContext.measureText(
                    labelText
                );

            const labelWidth =
                textMetrics.width + 20;

            const labelHeight =
                fontSize + 16;

            let labelY =
                y1 - labelHeight;

            if (labelY < 0) {
                labelY = y1;
            }

            let labelX = x1;

            if (
                labelX + labelWidth >
                canvasWidth
            ) {
                labelX =
                    canvasWidth - labelWidth;
            }

            labelX = Math.max(0, labelX);

            resultContext.fillStyle =
                boxColor;

            resultContext.fillRect(
                labelX,
                labelY,
                labelWidth,
                labelHeight
            );

            resultContext.fillStyle =
                "#061018";

            resultContext.fillText(
                labelText,
                labelX + 10,
                labelY + 8
            );
        }
    );
}


/*
|--------------------------------------------------------------------------
| Metrics
|--------------------------------------------------------------------------
*/

function updateMetrics(
    detections,
    responseData
) {
    detectionCount.textContent =
        String(detections.length);

    if (detections.length === 0) {
        topConfidence.textContent =
            "None";

    } else {
        const maximumConfidence =
            Math.max(
                ...detections.map(
                    (detection) =>
                        Number(
                            detection.confidence
                        ) || 0
                )
            );

        topConfidence.textContent =
            `${(maximumConfidence * 100).toFixed(1)}%`;
    }

    const inference =
        responseData?.images?.[0]?.speed?.inference;

    if (Number.isFinite(Number(inference))) {
        inferenceTime.textContent =
            `${Number(inference).toFixed(1)} ms`;

    } else {
        inferenceTime.textContent = "—";
    }
}


/*
|--------------------------------------------------------------------------
| Detection list
|--------------------------------------------------------------------------
*/

function renderDetectionsList(detections) {
    if (
        !Array.isArray(detections) ||
        detections.length === 0
    ) {
        detectionsList.innerHTML = `
            <p class="no-detections-message">
                No license plates detected.
            </p>
        `;

        return;
    }

    const colors = [
        "#00e5ff",
        "#ff4fd8",
        "#80ff72",
        "#ffd84d",
        "#9b7bff",
        "#ff745c",
    ];

    detectionsList.innerHTML =
        detections.map(
            (detection, index) => {
                const confidence =
                    (
                        detection.confidence * 100
                    ).toFixed(1);

                const color =
                    colors[index % colors.length];

                return `
                    <div class="detection-item">

                        <div class="detection-name">

                            <span
                                class="detection-color"
                                style="background: ${color};"
                            ></span>

                            <span>
                                ${escapeHtml(detection.label)}
                            </span>

                        </div>

                        <div class="detection-confidence">
                            ${confidence}%
                        </div>

                    </div>
                `;
            }
        ).join("");
}


/*
|--------------------------------------------------------------------------
| Prevent HTML injection
|--------------------------------------------------------------------------
*/

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/*
|--------------------------------------------------------------------------
| Cleanup
|--------------------------------------------------------------------------
*/

window.addEventListener(
    "beforeunload",
    () => {
        stopCamera();
    }
);