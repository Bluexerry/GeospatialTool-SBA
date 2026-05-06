import React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import Slide from '@material-ui/core/Slide';
import Typography from '@material-ui/core/Typography';
import { MuiThemeProvider, createTheme } from '@material-ui/core/styles';
import indigo from '@material-ui/core/colors/indigo';

import emitter from '@utils/events.utils';
import FileBrowser from '@components/fileBrowser';

const theme = createTheme({
    palette: {
        primary: { main: indigo.A200 }
    }
});

const styles = {
    root: {
        position: 'fixed',
        top: 74,
        right: 10,
        width: 700,
        height: 'calc(100vh - 100px)',
        borderRadius: 9,
        margin: 0,
        zIndex: 900,
        boxShadow: '-6px 6px 15px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        backgroundColor: '#37474f',
        flexShrink: 0,
    },
    closeBtn: {
        position: 'absolute',
        top: 6,
        right: 8,
        fontSize: 22,
        color: 'white',
    },
    content: {
        flex: 1,
        padding: 0,
        overflow: 'hidden',
        '&:last-child': { paddingBottom: 0 },
    },
};

class FileBrowserController extends React.Component {
    state = { open: false };

    componentDidMount() {
        this.openListener = emitter.addListener('openFileBrowserController', () => {
            this.setState({ open: true });
        });
        this.closeListener = emitter.addListener('closeAllController', () => {
            this.setState({ open: false });
        });
    }

    componentWillUnmount() {
        emitter.removeListener(this.openListener);
        emitter.removeListener(this.closeListener);
    }

    render() {
        return (
            <MuiThemeProvider theme={theme}>
                <Slide direction="left" in={this.state.open}>
                    <Card style={styles.root}>
                        <CardContent style={styles.header}>
                            <Typography gutterBottom style={{ color: 'white', fontFamily: 'Lato, Arial, sans-serif' }} variant="h5" component="h2">
                                Explorador de Archivos
                            </Typography>
                            <IconButton style={styles.closeBtn} aria-label="Close" onClick={() => this.setState({ open: false })}>
                                <Icon fontSize="inherit">chevron_right</Icon>
                            </IconButton>
                        </CardContent>
                        <CardContent style={styles.content}>
                            <FileBrowser />
                        </CardContent>
                    </Card>
                </Slide>
            </MuiThemeProvider>
        );
    }
}

export default FileBrowserController;
