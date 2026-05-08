"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface JsonNodeProps {
  data: any;
  depth?: number;
  /** Quantos níveis ficam abertos por padrão */
  defaultExpandDepth?: number;
}

export function JsonTree({ data, defaultExpandDepth = 1 }: { data: any; defaultExpandDepth?: number }) {
  return (
    <div className="text-[11px] font-mono leading-relaxed">
      <JsonNode data={data} defaultExpandDepth={defaultExpandDepth} />
    </div>
  );
}

function JsonNode({ data, depth = 0, defaultExpandDepth = 1 }: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(depth > defaultExpandDepth);

  if (data === null) return <span className="text-muted-foreground/50">null</span>;
  if (typeof data === "boolean") return <span className="text-primary">{String(data)}</span>;
  if (typeof data === "number") return <span className="text-success">{data}</span>;
  if (typeof data === "string") {
    if (data.startsWith("http")) {
      return (
        <a href={data} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
          {data}
        </a>
      );
    }
    return <span className="text-warning break-all">&quot;{data}&quot;</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground">[]</span>;
    return (
      <div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground cursor-pointer inline-flex items-center gap-1"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span className="text-[10px] font-mono">Array[{data.length}]</span>
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-border/30 pl-2">
            {data.map((item, i) => (
              <div key={i} className="py-0.5">
                <span className="text-muted-foreground/50 text-[10px] mr-1">{i}:</span>
                <JsonNode data={item} depth={depth + 1} defaultExpandDepth={defaultExpandDepth} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-muted-foreground">{"{}"}</span>;
    return (
      <div>
        {depth > 0 && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground cursor-pointer inline-flex items-center gap-1"
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span className="text-[10px] font-mono">{"{"}...{keys.length} keys{"}"}</span>
          </button>
        )}
        {(!collapsed || depth === 0) && (
          <div className={depth > 0 ? "ml-4 border-l border-border/30 pl-2" : ""}>
            {keys.map(key => (
              <div key={key} className="py-0.5">
                <span className="text-foreground/70 font-semibold text-[11px]">{key}: </span>
                <JsonNode data={data[key]} depth={depth + 1} defaultExpandDepth={defaultExpandDepth} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}
