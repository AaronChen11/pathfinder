import { useEffect, useRef, useState } from "react";

function CategorySelect({ value, options, onChange, className = "" }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div className={`category-select ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className={`category-select-trigger ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value}</span>
        <span className="category-select-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="category-select-panel" role="listbox">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              className={`category-select-option ${option === value ? "active" : ""}`}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <span className="category-select-check" aria-hidden="true">
                {option === value ? "✓" : ""}
              </span>
              <span>{option}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default CategorySelect;
