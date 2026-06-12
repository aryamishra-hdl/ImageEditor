import "./index.css";
import ImageEditor from "./components/ImageEditor";
import { EditorProvider } from "./context/EditorContext";

function App() {
  return (
    <div className="h-screen flex items-stretch text-[13px] font-sans">
      <EditorProvider>
        <ImageEditor />
      </EditorProvider>
    </div>
  );
}

export default App;
