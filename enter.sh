if [ -z $SKIPBUILD ]; then
    echo "Building container..."
    docker build -t wg-easy-test .
fi

echo "Entering environment..."
docker run --rm -it \
    --name=wg-easy-test \
    -p 51822:51822/udp \
    -p 51821:51821/tcp \
    -p 5173:5173 \
    -v $PWD:/app \
    -v $PWD:/etc/wireguard \
    --cap-add=NET_ADMIN \
    --cap-add=SYS_MODULE \
    --sysctl=net.ipv4.ip_forward=1 \
    --sysctl=net.ipv4.conf.all.src_valid_mark=1 \
    wg-easy-test $*
