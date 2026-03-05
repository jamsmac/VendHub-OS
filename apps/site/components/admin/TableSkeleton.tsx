interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export default function TableSkeleton({
  rows = 5,
  columns = 4,
}: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-b border-espresso/5">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="px-4 py-3">
              <div
                className="h-4 bg-espresso/5 rounded-md animate-pulse"
                style={{ width: c === 0 ? "60%" : "40%" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
