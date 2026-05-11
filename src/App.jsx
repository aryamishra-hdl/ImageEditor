import "./App.css";
import ImageEditor from "./components/ImageEditor";
import { EditorProvider } from "./context/EditorContext";

function App() {
  return (
    <div className="app-shell">
      <EditorProvider>
        <ImageEditor />
      </EditorProvider>
    </div>
  );
}

export default App;
