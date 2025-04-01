export default function Grid() {
  // const baseConfig = {
  //   cellThickness: 0.5,
  //   cellColor: '#6f6f6f',
  //   sectionThickness: 1,
  //   sectionColor: '#3471eb',
  //   infiniteGrid: true
  // }

  return (
    <>
      <gridHelper args={[100, 100]} />
      <axesHelper args={[100]} />
    </>
  );
}
