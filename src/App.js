import * as React from "react";
import JSZip from "jszip";
import Clipper from "image-clipper";
import { saveAs } from "file-saver";
import "./styles.css";

const { useState, useEffect, useRef, useCallback } = React;

const now = new Date().getTime();

export default function App() {
  const resultZip = useRef(new JSZip());
  const addImageToZip = useCallback(
    (blob, count) => {
      resultZip.current.file(`masscropr-${now}-${count}.png`, blob);
    },
    [resultZip]
  );
  const downloadZip = useCallback(() => {
    updateDownloadButton(false, `Downloading ...`);

    resultZip.current.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `masscropah-${now}.zip`);
      content = null;
      updateDownloadButton(true, `Images Downloaded`);
    });
  }, [resultZip]);

  return (
    <div className="App">
      <h1>Masscropr</h1>
      <UploadFiles addImageToZip={addImageToZip} />
      <DownloadButton downloadZip={downloadZip} />
    </div>
  );
}

function UploadFiles({ addImageToZip }) {
  const [state, set] = useState({ disabled: false, count: 0 });

  return (
    <div className="fileInput">
      <input
        onChange={(evt) => {
          const rawFiles = Array.from(evt.target.files);

          if (rawFiles.length > 0) {
            set({
              disabled: true,
              count: rawFiles.length
            });
            processRawFiles(rawFiles, addImageToZip);
          }
        }}
        type="file"
        disabled={state.disabled}
        multiple
      />
      <span className={state.disabled ? "disabled" : ""}>
        {state.count === 0 ? "Select Images" : `${state.count} images selected`}
      </span>
    </div>
  );
}

function DownloadButton({ downloadZip }) {
  const [state, set] = useState({
    ready: false,
    label: "Select Images First!"
  });

  useEffect(() => {
    function handleEvt(evt) {
      set({
        ready: evt.detail.ready,
        label: evt.detail.label
      });
    }

    document.addEventListener("CUSTOM_DOWNLOAD_BUTTON_UPDATE", handleEvt);
    return () =>
      document.removeEventListener("CUSTOM_DOWNLOAD_BUTTON_UPDATE", handleEvt);
  }, []);

  return (
    <button onClick={downloadZip} className="download" disabled={!state.ready}>
      {state.label}
    </button>
  );
}

function updateDownloadButton(ready, label) {
  document.dispatchEvent(
    new CustomEvent("CUSTOM_DOWNLOAD_BUTTON_UPDATE", {
      detail: {
        ready,
        label
      }
    })
  );
}

async function processRawFiles(rawFiles, addImageToZip) {
  updateDownloadButton(
    false,
    `Starting up ... 0/${rawFiles.length} images processed`
  );

  for (let i = 0; i < rawFiles.length; i++) {
    const rawDataUrl = await readAsDataUrlSync(rawFiles[i]);
    const croppedBlob = await crop(rawDataUrl);
    addImageToZip(croppedBlob, i + 1);
    updateDownloadButton(
      false,
      `Processing ... ${i + 1}/${rawFiles.length} images processed`
    );
  }

  updateDownloadButton(
    true,
    `Download all ${rawFiles.length} processed images`
  );
}

async function readAsDataUrlSync(rawFile) {
  const dataUrl = await new Promise((res) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      res(e.target.result);
    };
    reader.readAsDataURL(rawFile);
  });
  return dataUrl;
}

async function crop(rawDataUrl) {
  const result = await new Promise((res) => {
    const source = new Image();
    source.onload = () => {
      Clipper(source)
        .resize(2178, 1521)
        .crop(129, 225, 1920, 1080)
        .getCanvas()
        .toBlob(
          (blob) => {
            res(blob);
          },
          "image/png",
          1
        );
    };
    source.src = rawDataUrl;
  });
  return result;
}
