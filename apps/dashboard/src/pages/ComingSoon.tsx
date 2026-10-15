import PageHeader from '../components/PageHeader';

// Stand-in for sidebar pages that aren't designed yet.
export default function ComingSoon({ title }: { title: string }) {
	return (
		<>
			<PageHeader title={title} />
			<p className="px-6 pb-[27px] text-lg text-med-blue">Coming soon</p>
		</>
	);
}
