// Stand-in for sidebar pages that aren't designed yet.
export default function ComingSoon({ title }: { title: string }) {
	return (
		<div className="flex h-full flex-col gap-[21px] px-6 py-[27px]">
			<div className="py-0.5">
				<h1 className="font-display text-3xl">{title}</h1>
			</div>
			<p className="text-lg text-med-blue">Coming soon</p>
		</div>
	);
}
