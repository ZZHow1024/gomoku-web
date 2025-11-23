export default function Video() {
    return (
        <div style={{ width: '100vw', height: '90vh', margin: 0, padding: 0 }}>
            <iframe
                src="//player.bilibili.com/player.html?isOutside=true&aid=114783336534561&bvid=BV14E3tzPEiP&cid=30811357950&p=1"
                allowFullScreen={true}
                style={{ width: '100%', height: '100%', border: 'none' }}
            ></iframe>
        </div>
    )
}
