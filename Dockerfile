FROM ubuntu

WORKDIR /root

ADD http://download.linuxaudio.org/lilypond/binaries/linux-64/lilypond-2.18.2-1.linux-64.sh ./
ADD http://download.linuxaudio.org/lilypond/binaries/linux-64/lilypond-2.19.20-1.linux-64.sh ./

RUN chmod +x lilypond-2.18.2-1.linux-64.sh lilypond-2.19.20-1.linux-64.sh
RUN ./lilypond-2.18.2-1.linux-64.sh --batch --prefix /root/stable
RUN ./lilypond-2.19.20-1.linux-64.sh --batch --prefix /root/unstable
