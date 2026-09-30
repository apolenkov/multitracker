type Props = Readonly<{ label: string; value: string; context: string }>;

export function Answer({ label, value, context }: Props) {
  return (
    <>
      <dl className="analytics-answer">
        <div>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      </dl>
      <p className="analytics-answer-context">{context}</p>
    </>
  );
}
