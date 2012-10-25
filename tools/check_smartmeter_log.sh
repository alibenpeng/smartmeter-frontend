#!/bin/sh

log_file=/www/sm/data/smartmeter.log

real_date=$(date -Iminutes | sed 's/+.*//')
log_date=$(tail -n1 $log_file | sed 's/:[0-9]\+: .*//')

real_hours=$(echo $real_date | sed 's/:[0-9]\+$//')
log_hours=$(echo $log_date | sed 's/:[0-9]\+$//')

log_minutes=$(echo $log_date | sed 's/.*:\([0-9]\+\)$/\1/')
real_minutes=$(echo $real_date | sed 's/.*:\([0-9]\+\)$/\1/')

diff=$(( $real_minutes - $log_minutes ))


if [ $real_hours = $log_hours ] ; then
	if [ $diff -le 1 ] ; then # one minute or less
		echo OK
		exit 0
	elif [ $diff -le 5 ] ; then # five minutes or less
		echo WARNING
		exit 1
	else
		echo CRITICAL
		exit 2
	fi
else
	echo "HOLY SHIT, WE'RE ALL GONNA DIE!!!1"
	exit 2
fi
