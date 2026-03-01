import { useEffect } from "react";
import type { Location } from "../types";
import { CloseIcon } from "./Icons";

interface SearchModalProps {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onPickLocation: (location: Location) => void;
  loading: boolean;
  error: string | null;
  results: Location[];
}

export function SearchModal({
  open,
  query,
  onQueryChange,
  onClose,
  onPickLocation,
  loading,
  error,
  results,
}: SearchModalProps): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Choose location">
      <div className="search-inner-layer" onClick={onClose} />
      <div className="search-form-shell">
        <div className="search-form">
          <div className="search-header">
            <p>Choose Location</p>
            <button aria-label="Close search" className="icon-ghost-button" onClick={onClose} type="button">
              <CloseIcon size={18} />
            </button>
          </div>

          <div className="search-controls">
            <input
              autoFocus
              className="search-input"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search city..."
              type="text"
              value={query}
            />
            <button className="search-clear-button" onClick={() => onQueryChange("")} type="button">
              Clear
            </button>
          </div>

          <div className="search-results" role="listbox" aria-label="Location results">
            {loading ? <p className="search-message">Searching...</p> : null}
            {!loading && error ? <p className="search-message error">{error}</p> : null}
            {!loading && !error && query.trim().length < 2 ? (
              <p className="search-message">Type at least 2 characters.</p>
            ) : null}
            {!loading && !error && query.trim().length >= 2 && results.length === 0 ? (
              <p className="search-message">No matching locations.</p>
            ) : null}

            {!loading && !error && query.trim().length >= 2
              ? results.map((result) => (
                  <button
                    key={`${result.latitude}:${result.longitude}:${result.name}`}
                    className="search-result-item"
                    onClick={() => onPickLocation(result)}
                    role="option"
                    type="button"
                  >
                    <span>{result.name}</span>
                  </button>
                ))
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
